import fs from "node:fs";
import path from "node:path";

/**
 * AI Provider selection & template rendering utilities for create-sailor.
 *
 * The renderer consumes `@sailor:*` markers embedded in the templates shipped
 * by `@nebutra/ai-providers/templates/` (meta-only package) and produces a
 * per-app registry.ts and .env.example with only the blocks relevant to the
 * user's selection.
 *
 * Runtime AI helpers (generateText, streamText, embed, createModel, agents)
 * live in `@nebutra/agents` — scaffolded apps import from there.
 */

export interface CustomEndpoint {
  name: string;
  baseURL: string;
  apiKeyEnvName: string;
}

export interface ProviderSelection {
  providerIds: string[];
  customEndpoint?: CustomEndpoint;
}

/** CN-compatible providers that require `createOpenAICompatible`. */
const CN_COMPATIBLE_IDS = new Set(["siliconflow", "volcengine-ark", "bailian", "moonshot"]);

const MARKER_RE = /@sailor:([^\s*]+)/;

interface MarkerDecision {
  marker: string;
  keep: boolean;
}

function decideMarker(marker: string, selection: ProviderSelection): MarkerDecision {
  const { providerIds, customEndpoint } = selection;

  if (marker.startsWith("provider:")) {
    const id = marker.slice("provider:".length);
    return { marker, keep: providerIds.includes(id) };
  }
  if (marker === "cn-compatible") {
    const hasCn = providerIds.some((id) => CN_COMPATIBLE_IDS.has(id));
    return { marker, keep: hasCn || !!customEndpoint };
  }
  if (marker.startsWith("cn-instance:")) {
    const id = marker.slice("cn-instance:".length);
    return { marker, keep: providerIds.includes(id) };
  }
  if (marker === "custom-endpoint") {
    return { marker, keep: !!customEndpoint };
  }
  if (marker === "registry-entries") {
    // Handled separately in renderRegistryEntries.
    return { marker, keep: true };
  }
  // Unknown marker: keep by default, strip marker comment.
  return { marker, keep: true };
}

function stripMarkerComment(line: string): string {
  return line.replace(/\s*\/\/\s*@sailor:[^\n]*$/, "");
}

function stripMarkerHash(line: string): string {
  return line.replace(/\s*#\s*@sailor:[^\n]*$/, "");
}

/**
 * Renders a template by processing `@sailor:*` markers line-by-line.
 *
 * Marker rules:
 *  - A marker line "owns" the block of non-blank, non-marker lines that
 *    immediately follow it, until the next blank line or next marker.
 *  - If the marker is kept, the marker comment is stripped and the block
 *    is emitted.
 *  - If the marker is dropped, both the marker line and its block are
 *    skipped entirely.
 */
export function renderTemplate(template: string, selection: ProviderSelection): string {
  const lines = template.split("\n");
  const result: string[] = [];
  const isEnvTemplate = template.includes("#");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(MARKER_RE);

    if (!match) {
      result.push(line);
      i++;
      continue;
    }

    const { marker, keep } = decideMarker(match[1], selection);

    // The registry-entries marker sits inside an object literal — we only
    // strip the marker comment; filtering of entry keys happens in a pass
    // over the final text.
    if (marker === "registry-entries") {
      result.push(isEnvTemplate ? stripMarkerHash(line) : stripMarkerComment(line));
      i++;
      continue;
    }

    if (keep) {
      const cleaned = isEnvTemplate ? stripMarkerHash(line) : stripMarkerComment(line);
      // If marker was inline on a code line (not a standalone comment),
      // keep the code portion. Otherwise drop the now-empty marker line.
      if (cleaned.trim().length > 0) {
        result.push(cleaned);
      }
      // Emit the owned block as-is.
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== "" && !MARKER_RE.test(lines[j])) {
        result.push(lines[j]);
        j++;
      }
      // Preserve one blank separator if present.
      if (j < lines.length && lines[j].trim() === "") {
        result.push(lines[j]);
        j++;
      }
      i = j;
    } else {
      // Skip marker + its owned block + trailing blank.
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== "" && !MARKER_RE.test(lines[j])) {
        j++;
      }
      if (j < lines.length && lines[j].trim() === "") {
        j++;
      }
      i = j;
    }
  }

  return filterRegistryEntries(result.join("\n"), selection);
}

/**
 * Filters identifiers listed inside `createProviderRegistry({ ... })`
 * down to just the ones whose instances still exist in the file.
 */
function filterRegistryEntries(code: string, selection: ProviderSelection): string {
  const { providerIds, customEndpoint } = selection;

  const allowed = new Set<string>();
  for (const id of providerIds) {
    if (["openai", "anthropic", "google", "mistral", "xai"].includes(id)) {
      allowed.add(id);
    }
    allowed.add(id.replace(/-/g, "_"));
    allowed.add(id);
  }
  if (customEndpoint) allowed.add("custom");

  const registryRe = /createProviderRegistry\(\{([\s\S]*?)\}\)/;
  const match = code.match(registryRe);
  if (!match) return code;

  const body = match[1];
  const filteredLines = body
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("//")) return true;
      const entryMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*,?$/);
      if (entryMatch) return allowed.has(entryMatch[1]);
      return true;
    })
    .join("\n");

  return code.replace(registryRe, `createProviderRegistry({${filteredLines}})`);
}

export function renderProviderRegistry(selection: ProviderSelection, templateDir: string): string {
  const templatePath = path.join(templateDir, "registry.ts.template");
  const template = fs.readFileSync(templatePath, "utf-8");
  return renderTemplate(template, selection);
}

export function renderProviderEnvExample(
  selection: ProviderSelection,
  templateDir: string,
): string {
  const templatePath = path.join(templateDir, ".env.example.template");
  const template = fs.readFileSync(templatePath, "utf-8");
  return renderTemplate(template, selection);
}

export async function applyProviderSelection(
  targetDir: string,
  selection: ProviderSelection,
  templateDir: string,
) {
  const registryOut = renderProviderRegistry(selection, templateDir);
  const envOut = renderProviderEnvExample(selection, templateDir);

  // Scaffold the generated registry.ts into @nebutra/agents in the target repo.
  // The registry is consumed at runtime by the AI helpers (generateText, etc.).
  const agentsSrcDir = path.join(targetDir, "packages/agents/src");
  await fs.promises.mkdir(agentsSrcDir, { recursive: true });
  await fs.promises.writeFile(path.join(agentsSrcDir, "registry.ts"), registryOut);
  await fs.promises.appendFile(path.join(targetDir, ".env.example"), "\n" + envOut);

  // Derive dependencies based on AI selection
  const deps: Record<string, string> = { ai: "latest" };
  const { providerIds, customEndpoint } = selection;
  if (
    providerIds.includes("openai") ||
    customEndpoint ||
    providerIds.some((id) => CN_COMPATIBLE_IDS.has(id))
  ) {
    deps["@ai-sdk/openai"] = "latest";
    deps["@ai-sdk/openai-compatible"] = "latest";
  }
  if (providerIds.includes("anthropic")) deps["@ai-sdk/anthropic"] = "latest";
  if (providerIds.includes("google")) deps["@ai-sdk/google"] = "latest";
  if (providerIds.includes("mistral")) deps["@ai-sdk/mistral"] = "latest";
  if (providerIds.includes("xai")) deps["@ai-sdk/openai"] = "latest"; // xAI is OpenAI compatible

  const packageJsonPath = path.join(targetDir, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(await fs.promises.readFile(packageJsonPath, "utf-8"));
    if (!pkg.dependencies) pkg.dependencies = {};
    for (const [dep, version] of Object.entries(deps)) {
      pkg.dependencies[dep] = version;
    }
    await fs.promises.writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n");
  }
}
