import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { DesignTokenLeafSchema, type DesignTokenSet, type DesignTokenTree } from "./types";

// =============================================================================
// DTCG Filesystem I/O
// =============================================================================
// Shared helpers used by every provider. Reading and writing the canonical
// W3C DTCG JSON tree on disk is identical across Figma / Penpot / git-only —
// the only thing that differs is what the provider does AFTER it has the data.
// =============================================================================

const TOKEN_FILE_EXT = ".json";

/**
 * Recursively list every `.json` file beneath `root`. Skips dotfiles.
 */
async function listJsonFiles(root: string): Promise<string[]> {
  const out: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith(".")) continue;
      const full = join(dir, entry);
      const info = await stat(full);
      if (info.isDirectory()) {
        await walk(full);
      } else if (info.isFile() && entry.endsWith(TOKEN_FILE_EXT)) {
        out.push(full);
      }
    }
  }

  await walk(root);
  return out.sort();
}

/**
 * Validate that every leaf in a DTCG tree carries `$value` and `$type`.
 * Returns a list of dot-paths that violate the contract.
 */
export function validateDtcgTree(tree: unknown, pathPrefix = ""): string[] {
  const errors: string[] = [];

  if (tree === null || typeof tree !== "object" || Array.isArray(tree)) {
    return errors;
  }

  const node = tree as Record<string, unknown>;

  // A leaf has `$value` (or `value` for legacy Tokens Studio v1).
  const hasValue = "$value" in node || "value" in node;
  if (hasValue) {
    const parsed = DesignTokenLeafSchema.safeParse(node);
    if (!parsed.success) {
      errors.push(`${pathPrefix || "<root>"}: ${parsed.error.message}`);
    }
    return errors;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    const childPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    errors.push(...validateDtcgTree(value, childPath));
  }

  return errors;
}

/**
 * Read all DTCG token files under `tokensDir` into memory.
 * Each file becomes one `DesignTokenSet`.
 */
export async function readTokenSets(tokensDir: string): Promise<DesignTokenSet[]> {
  const files = await listJsonFiles(tokensDir);
  const sets: DesignTokenSet[] = [];

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        `[design-sync] Failed to parse DTCG file ${file}: ${(error as Error).message}`,
      );
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`[design-sync] DTCG file ${file} must contain an object at the root.`);
    }

    const relativePath = relative(tokensDir, file).split(sep).join("/");
    const name = relativePath.replace(/\.json$/u, "").replace(/\//gu, "/");

    sets.push({
      name,
      relativePath,
      tokens: parsed as DesignTokenTree,
    });
  }

  return sets;
}

/**
 * Write a `DesignTokenSet` back to disk under `tokensDir`. Creates
 * parent directories as needed and uses 2-space indentation with a
 * trailing newline (matches `.tokens-studio/config.json#format`).
 */
export async function writeTokenSet(tokensDir: string, set: DesignTokenSet): Promise<void> {
  const target = join(tokensDir, set.relativePath);
  await mkdir(dirname(target), { recursive: true });
  const serialized = `${JSON.stringify(set.tokens, null, 2)}\n`;
  await writeFile(target, serialized, "utf8");
}

/**
 * Default tokens directory for the Nebutra-Sailor monorepo.
 */
export function defaultTokensDir(cwd: string = process.cwd()): string {
  return join(cwd, "packages", "design", "design-tokens", "tokens");
}

/**
 * Default Tokens Studio metadata directory for the Nebutra-Sailor monorepo.
 */
export function defaultTokensStudioDir(cwd: string = process.cwd()): string {
  return join(cwd, ".tokens-studio");
}
