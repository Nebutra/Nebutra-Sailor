import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
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
 * Override: SAILOR_TEMPLATE_REPO="<owner>/<repo>" + SAILOR_TEMPLATE_REF="<branch|tag|sha>"
 * Opt-in mutable fallback: SAILOR_TEMPLATE_ALLOW_MUTABLE_FALLBACK=1
 */
const TEMPLATE_SOURCES = {
  mirror: {
    repo: process.env.SAILOR_TEMPLATE_REPO || "Nebutra/Sailor-Template",
    ref: process.env.SAILOR_TEMPLATE_REF || "main",
    applyIgnore: false, // mirror is pre-stripped
    allowMutableFallback: process.env.SAILOR_TEMPLATE_ALLOW_MUTABLE_FALLBACK === "1",
  },
  main: {
    repo: "Nebutra/Nebutra-Sailor",
    ref: "main",
    applyIgnore: true, // live source needs runtime stripping
    allowMutableFallback: process.env.SAILOR_TEMPLATE_ALLOW_MUTABLE_FALLBACK === "1",
  },
} as const;

function mutableTarballUrl(repo: string, ref: string): string {
  return `https://github.com/${repo}/archive/refs/heads/${ref}.tar.gz`;
}

function immutableTarballUrl(repo: string, sha: string): string {
  return `https://github.com/${repo}/archive/${sha}.tar.gz`;
}

function isCommitSha(ref: string): boolean {
  return /^[0-9a-f]{7,40}$/i.test(ref);
}

function resolveImmutableRefWithGit(repo: string, ref: string): string | null {
  const remote = `https://github.com/${repo}.git`;
  const candidates = [`refs/heads/${ref}`, `refs/tags/${ref}`];

  for (const candidate of candidates) {
    try {
      const output = execFileSync("git", ["ls-remote", remote, candidate], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();

      if (!output) continue;

      const [sha] = output.split(/\s+/);
      if (isCommitSha(sha)) {
        return sha;
      }
    } catch {
      // Ignore and continue to the next candidate.
    }
  }

  return null;
}

async function resolveImmutableRef(repo: string, ref: string): Promise<string> {
  if (isCommitSha(ref)) {
    return ref;
  }

  const response = await fetch(
    `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(ref)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "create-sailor",
      },
    },
  );

  if (!response.ok) {
    const fallbackSha = resolveImmutableRefWithGit(repo, ref);
    if (fallbackSha) {
      return fallbackSha;
    }
    throw new Error(`Failed to resolve ${repo}@${ref} (GitHub API ${response.status})`);
  }

  const data = (await response.json()) as { sha?: unknown };
  if (typeof data.sha !== "string" || data.sha.length === 0) {
    throw new Error(`GitHub API did not return a commit SHA for ${repo}@${ref}`);
  }

  return data.sha;
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

async function downloadFile(url: string, targetPath: string): Promise<number> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/octet-stream",
      "User-Agent": "create-sailor",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download archive (${response.status})`);
  }

  const archive = Buffer.from(await response.arrayBuffer());
  if (archive.byteLength < 1024) {
    throw new Error(`Downloaded archive is unexpectedly small (${archive.byteLength} bytes)`);
  }

  fs.writeFileSync(targetPath, archive);
  const stats = fs.statSync(targetPath);
  if (stats.size !== archive.byteLength) {
    throw new Error(`Archive write verification failed (${stats.size} != ${archive.byteLength})`);
  }

  return stats.size;
}

function extractTarball(archivePath: string, targetDir: string): void {
  execFileSync("tar", ["-xzf", archivePath, "-C", targetDir, "--strip-components=1"], {
    stdio: "ignore",
  });
}

function resetDirectory(targetDir: string): void {
  try {
    const entries = fs.readdirSync(targetDir);
    for (const entry of entries) {
      fs.rmSync(path.join(targetDir, entry), { recursive: true, force: true });
    }
  } catch {
    /* noop */
  }
}

async function downloadTemplateSource(
  source: (typeof TEMPLATE_SOURCES)[keyof typeof TEMPLATE_SOURCES],
  targetDir: string,
): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-"));
  const archivePath = path.join(tempDir, "template.tar.gz");

  try {
    const immutableRef = await resolveImmutableRef(source.repo, source.ref);
    await downloadFile(immutableTarballUrl(source.repo, immutableRef), archivePath);
    extractTarball(archivePath, targetDir);
  } catch (error) {
    if (!source.allowMutableFallback) {
      throw error;
    }

    resetDirectory(targetDir);
    await downloadFile(mutableTarballUrl(source.repo, source.ref), archivePath);
    extractTarball(archivePath, targetDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function cloneTemplate(targetDir: string): Promise<void> {
  fs.mkdirSync(targetDir, { recursive: true });

  const explicitSource = process.env.SAILOR_TEMPLATE_SOURCE as "main" | "mirror" | undefined;

  const order: Array<keyof typeof TEMPLATE_SOURCES> =
    explicitSource === "main" ? ["main"] : ["mirror", "main"];

  let lastError: Error | undefined;
  for (const key of order) {
    const source = TEMPLATE_SOURCES[key];
    try {
      await downloadTemplateSource(source, targetDir);
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
      resetDirectory(targetDir);
    }
  }

  throw new Error(
    `Failed to download the template from any source. Last error: ${
      lastError?.message ?? "unknown"
    }\n\nEnsure you have internet access and 'tar' installed.\nYou can override the source with SAILOR_TEMPLATE_REPO / SAILOR_TEMPLATE_REF env vars.`,
  );
}
