import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COPYABLE_EXT = /\.(md|mdx|json|ts|tsx|js|mjs|cjs|yaml|yml|css|html|toml|py)$/;

export interface ScaffoldExtrasOptions {
  projectName: string;
}

/**
 * Top-level scaffold folders matching the Nebutra-Sailor layout. Every
 * scaffold gets all of them — there are no opt-in folders. `deploy` holds the
 * portable container build (Dockerfile.web + docker-compose.yml) and lands at
 * the project root: the scaffold ships a container, not a platform choice.
 */
const FOLDERS: readonly string[] = ["backends/gateway", "infra", "e2e", "tests", "deploy"];
const ROOT_FOLDERS: ReadonlySet<string> = new Set(["deploy"]);

function resolveTemplatesRoot(): string {
  const candidates = [
    path.join(__dirname, "..", "templates"),
    path.join(__dirname, "..", "..", "templates"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

export async function applyScaffoldExtras(
  targetDir: string,
  options: ScaffoldExtrasOptions,
): Promise<{ applied: string[]; skipped: string[] }> {
  const templatesRoot = resolveTemplatesRoot();
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const folder of FOLDERS) {
    const src = path.join(templatesRoot, folder);
    if (!fs.existsSync(src)) {
      skipped.push(folder);
      continue;
    }
    const dst = ROOT_FOLDERS.has(folder) ? targetDir : path.join(targetDir, folder);
    copyRecursive(src, dst);
    if (!ROOT_FOLDERS.has(folder)) {
      replacePlaceholders(dst, { "{PRODUCT_NAME}": options.projectName });
    }
    applied.push(folder);
  }

  return { applied, skipped };
}

function copyRecursive(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else if (!fs.existsSync(d)) {
      fs.copyFileSync(s, d);
    }
  }
}

function replacePlaceholders(dir: string, replacements: Record<string, string>): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replacePlaceholders(p, replacements);
      continue;
    }
    if (!COPYABLE_EXT.test(entry.name)) continue;
    let content = fs.readFileSync(p, "utf-8");
    let changed = false;
    for (const [key, value] of Object.entries(replacements)) {
      if (content.includes(key)) {
        content = content.split(key).join(value);
        changed = true;
      }
    }
    if (changed) fs.writeFileSync(p, content);
  }
}
