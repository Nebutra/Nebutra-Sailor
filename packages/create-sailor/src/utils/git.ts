import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ignore from "ignore";

/**
 * Template source resolution (dual-repo strategy).
 *
 * Primary: nebutra/sailor-template — pre-stripped skeleton auto-synced from
 * the main repo via .github/workflows/sync-template.yml. Smaller, faster,
 * no runtime .templateignore application needed.
 *
 * Fallback: Nebutra/Nebutra-Sailor main — the live source. Used when:
 *   - SAILOR_TEMPLATE_SOURCE=main env var is set (debug)
 *   - the primary mirror returns 404 (mirror CI temporarily behind)
 *
 * Override: SAILOR_TEMPLATE_REPO="<owner>/<repo>" + SAILOR_TEMPLATE_REF="<branch>"
 */
const TEMPLATE_SOURCES = {
  mirror: {
    repo: process.env.SAILOR_TEMPLATE_REPO || "Nebutra/Sailor-Template",
    ref: process.env.SAILOR_TEMPLATE_REF || "main",
    applyIgnore: false, // mirror is pre-stripped
  },
  main: {
    repo: "Nebutra/Nebutra-Sailor",
    ref: "main",
    applyIgnore: true, // live source needs runtime stripping
  },
} as const;

function tarballUrl(repo: string, ref: string): string {
  return `https://github.com/${repo}/archive/refs/heads/${ref}.tar.gz`;
}

/**
 * Walks a directory and collects every relative path (POSIX-style).
 * Skips node_modules and .git to keep the matcher fast.
 */
function collectPaths(root: string, current: string, out: string[]): void {
  const entries = fs.readdirSync(current, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(current, entry.name);
    const rel = path.relative(root, full).split(path.sep).join("/");
    if (entry.isDirectory()) {
      out.push(rel + "/");
      collectPaths(root, full, out);
    } else {
      out.push(rel);
    }
  }
}

/**
 * Apply `.templateignore` to a freshly cloned template directory.
 * Removes every file/directory matched by a gitignore-style pattern, then
 * deletes the `.templateignore` file itself.
 */
function applyTemplateIgnore(targetDir: string): void {
  const ignorePath = path.join(targetDir, ".templateignore");
  if (!fs.existsSync(ignorePath)) return;

  const patterns = fs.readFileSync(ignorePath, "utf8");
  const matcher = ignore().add(patterns);

  const paths: string[] = [];
  collectPaths(targetDir, targetDir, paths);

  // Normalize (ignore lib doesn't want trailing slashes)
  const normalized = paths.map((p) => (p.endsWith("/") ? p.slice(0, -1) : p));

  // matcher.filter returns KEPT paths; we want the complement.
  const kept = new Set(matcher.filter(normalized));
  const toDelete = normalized
    .filter((p) => !kept.has(p))
    // Remove deeper paths first so parent rmSync never races with children.
    .sort((a, b) => b.split("/").length - a.split("/").length);

  for (const rel of toDelete) {
    const abs = path.join(targetDir, rel);
    try {
      if (fs.existsSync(abs)) {
        fs.rmSync(abs, { recursive: true, force: true });
      }
    } catch {
      // Ignore individual deletion errors — scaffolding should not fail hard.
    }
  }

  // Always remove the manifest itself last.
  try {
    if (fs.existsSync(ignorePath)) fs.rmSync(ignorePath, { force: true });
  } catch {
    // noop
  }
}

function downloadTarball(url: string, targetDir: string): void {
  execSync(`set -o pipefail; curl -sSfL ${url} | tar -xz -C "${targetDir}" --strip-components=1`, {
    stdio: "ignore",
    shell: "bash",
  });
}

export async function cloneTemplate(targetDir: string): Promise<void> {
  fs.mkdirSync(targetDir, { recursive: true });

  const explicitSource = process.env.SAILOR_TEMPLATE_SOURCE as "main" | "mirror" | undefined;

  const order: Array<keyof typeof TEMPLATE_SOURCES> =
    explicitSource === "main" ? ["main"] : ["mirror", "main"];

  let lastError: Error | undefined;
  for (const key of order) {
    const source = TEMPLATE_SOURCES[key];
    const url = tarballUrl(source.repo, source.ref);
    try {
      downloadTarball(url, targetDir);
      if (source.applyIgnore) {
        try {
          applyTemplateIgnore(targetDir);
        } catch (error) {
          throw new Error(
            `Template cloned, but .templateignore processing failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // empty the dir before retrying the next source
      try {
        const entries = fs.readdirSync(targetDir);
        for (const entry of entries) {
          fs.rmSync(path.join(targetDir, entry), { recursive: true, force: true });
        }
      } catch {
        /* noop */
      }
    }
  }

  throw new Error(
    `Failed to download the template from any source. Last error: ${
      lastError?.message ?? "unknown"
    }\n\nEnsure you have internet access and curl/tar installed.\nYou can override the source with SAILOR_TEMPLATE_REPO / SAILOR_TEMPLATE_REF env vars.`,
  );
}
