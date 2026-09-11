import { execFileSync } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ignore from "ignore";

/**
 * Template source resolution (dual-repo strategy).
 *
 * Primary: Nebutra/Sailor-Template — pre-stripped skeleton auto-synced from
 * the main repo via .github/workflows/sync-template.yml. Smaller, faster,
 * no runtime .templateignore application needed.
 *
 * Fallback: Nebutra/Nebutra-Sailor main — the live source. Used when:
 *   - SAILOR_TEMPLATE_SOURCE=main env var is set (debug)
 *   - the primary mirror returns 404 (mirror CI temporarily behind)
 *
 * Override: SAILOR_TEMPLATE_REPO="<owner>/<repo>" + SAILOR_TEMPLATE_REF="<branch|tag|sha>"
 * Opt-in mutable fallback: SAILOR_TEMPLATE_ALLOW_MUTABLE_FALLBACK=1
 *
 * ---------------------------------------------------------------------------
 * SAFETY CONTRACT — read before editing this file
 * ---------------------------------------------------------------------------
 * Nothing in here may delete, truncate, or overwrite anything inside
 * `targetDir` until a template tree has been fully downloaded, extracted and
 * stripped in a temp staging directory. Every download/extract/retry happens
 * under `os.tmpdir()`; the target is written exactly once, at the end, by
 * `mergeIntoTarget`.
 *
 * This is not a style preference. An earlier version called a
 * `resetDirectory(targetDir)` helper — an unguarded rm -rf over every entry of
 * the target — from the catch of the source loop. Scaffolding into the current
 * directory from `~` therefore pointed that rm -rf at the user's home
 * directory, and a failed download (the 126 MB mirror timing out was enough)
 * triggered it. Never reintroduce a reset of the target on the failure path.
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

type TemplateSource = (typeof TEMPLATE_SOURCES)[keyof typeof TEMPLATE_SOURCES];

/** Abort a download that has produced no bytes at all for this long. */
const STALL_TIMEOUT_MS = 30_000;
/** Attempts per source before moving on to the next one. */
const MAX_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Progress reporting
// ---------------------------------------------------------------------------

export type ClonePhase = "resolve" | "download" | "extract" | "strip" | "install" | "retry";

export interface CloneProgressEvent {
  phase: ClonePhase;
  /** Human label for the source being used, e.g. "Nebutra/Sailor-Template@main". */
  source: string;
  /** Bytes written so far (download phase only). */
  receivedBytes?: number;
  /** Content-Length when the server sent one (download phase only). */
  totalBytes?: number;
  /** 1-based attempt counter (download / retry phases). */
  attempt?: number;
  /** Why a retry is happening (retry phase only). */
  reason?: string;
}

export interface CloneTemplateOptions {
  onProgress?: (event: CloneProgressEvent) => void;
}

export interface CloneTemplateResult {
  /** Label of the source the template actually came from. */
  source: string;
  /** Uncompressed size of the installed tree, in bytes. */
  bytes: number;
  /**
   * Top-level entries `mergeIntoTarget` newly created inside targetDir.
   * Pre-existing entries are excluded, so this list is safe to delete when
   * rolling a partial scaffold back.
   */
  createdEntries: string[];
}

function describeSource(source: TemplateSource): string {
  return `${source.repo}@${source.ref}`;
}

/**
 * Local-filesystem template source (offline / headless / CI).
 *
 * When SAILOR_TEMPLATE_LOCAL_DIR points at a directory, the scaffold path is
 * exercised by copying that directory instead of downloading a GitHub tarball.
 * This makes a real, full end-to-end scaffold reproducible without network
 * access — e.g. point it at a checkout of the template repo in CI.
 *
 * The copy skips node_modules/.git/dist (mirroring collectPaths) and then runs
 * the same `.templateignore` stripping the live GitHub source gets, so a local
 * clone produces a byte-for-byte equivalent layout to the `main` source.
 */
function localTemplateDir(): string | undefined {
  const dir = process.env.SAILOR_TEMPLATE_LOCAL_DIR;
  if (!dir || dir.trim().length === 0) return undefined;
  return path.resolve(dir.trim());
}

const COPY_SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".next", ".turbo"]);

function copyTemplateDir(sourceDir: string, targetDir: string): void {
  const stat = fs.statSync(sourceDir);
  if (!stat.isDirectory()) {
    throw new Error(`SAILOR_TEMPLATE_LOCAL_DIR is not a directory: ${sourceDir}`);
  }

  fs.cpSync(sourceDir, targetDir, {
    recursive: true,
    dereference: true,
    filter: (src) => {
      const base = path.basename(src);
      return !COPY_SKIP_DIRS.has(base);
    },
  });
}

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

  let response: Response;
  try {
    response = await fetch(
      `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(ref)}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "create-sailor",
        },
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch (error) {
    // The API is unreachable (offline, DNS, proxy, rate-limit reset). `git
    // ls-remote` goes over a different transport and often still works.
    const fallbackSha = resolveImmutableRefWithGit(repo, ref);
    if (fallbackSha) {
      return fallbackSha;
    }
    throw new Error(
      `Cannot reach api.github.com to resolve ${repo}@${ref} (${describeNetworkError(error)})`,
    );
  }

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
 *
 * Only ever called on a staging directory this process created.
 */
function applyTemplateIgnore(stagedDir: string): void {
  const ignorePath = path.join(stagedDir, ".templateignore");
  if (!fs.existsSync(ignorePath)) return;

  const patterns = fs.readFileSync(ignorePath, "utf8");
  const matcher = ignore().add(patterns);

  const paths: string[] = [];
  collectPaths(stagedDir, stagedDir, paths);

  // Normalize (ignore lib doesn't want trailing slashes)
  const normalized = paths.map((p) => (p.endsWith("/") ? p.slice(0, -1) : p));

  // matcher.filter returns KEPT paths; we want the complement.
  const kept = new Set(matcher.filter(normalized));
  const toDelete = normalized
    .filter((p) => !kept.has(p))
    // Remove deeper paths first so parent rmSync never races with children.
    .sort((a, b) => b.split("/").length - a.split("/").length);

  for (const rel of toDelete) {
    const abs = path.join(stagedDir, rel);
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

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/** Turn an opaque `fetch failed` into something a user can act on. */
function describeNetworkError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const cause = (error as { cause?: unknown }).cause;
  const causeCode =
    cause && typeof cause === "object" && "code" in cause
      ? String((cause as { code: unknown }).code)
      : undefined;
  const causeMessage = cause instanceof Error ? cause.message : undefined;

  switch (causeCode) {
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "DNS lookup failed — check your connection or proxy";
    case "ECONNREFUSED":
      return "connection refused — a proxy or firewall may be blocking github.com";
    case "ECONNRESET":
      return "connection reset by peer mid-transfer";
    case "ETIMEDOUT":
    case "UND_ERR_CONNECT_TIMEOUT":
      return "connection timed out";
    case "UND_ERR_HEADERS_TIMEOUT":
    case "UND_ERR_BODY_TIMEOUT":
      return "the server stopped sending data mid-transfer";
    case "CERT_HAS_EXPIRED":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
    case "SELF_SIGNED_CERT_IN_CHAIN":
      return "TLS certificate rejected — a corporate proxy may be intercepting HTTPS";
    default:
      break;
  }

  if (error.name === "TimeoutError") return "request timed out";
  if (error.name === "AbortError") return error.message || "transfer aborted";

  return causeMessage ? `${error.message}: ${causeMessage}` : error.message;
}

/** 404/403 will not get better by trying again; everything else might. */
function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

interface DownloadOutcome {
  bytes: number;
}

async function downloadFileOnce(
  url: string,
  targetPath: string,
  onBytes?: (received: number, total?: number) => void,
): Promise<DownloadOutcome> {
  const controller = new AbortController();
  let stallTimer: NodeJS.Timeout | undefined;

  // A whole-request timeout is wrong for a large tarball on a slow link: a
  // legitimately slow 126 MB download would be killed. Abort only when the
  // socket produces no bytes at all for STALL_TIMEOUT_MS.
  const armStallTimer = (): void => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      controller.abort(
        new Error(
          `no data received for ${Math.round(STALL_TIMEOUT_MS / 1000)}s — transfer stalled`,
        ),
      );
    }, STALL_TIMEOUT_MS);
  };

  armStallTimer();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/octet-stream",
        "User-Agent": "create-sailor",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!response.ok) {
      const err = new Error(
        `Failed to download archive (HTTP ${response.status} ${response.statusText})`,
      );
      (err as { retryable?: boolean }).retryable = isRetryableStatus(response.status);
      throw err;
    }

    if (!response.body) {
      throw new Error("Download response had no body");
    }

    const header = response.headers.get("content-length");
    const totalBytes = header && /^\d+$/.test(header) ? Number(header) : undefined;

    // Stream to disk. The previous implementation used `await
    // response.arrayBuffer()`, buffering the entire (126 MB and growing)
    // tarball in memory before writing a byte.
    const out = fs.createWriteStream(targetPath);
    const reader = response.body.getReader();
    let received = 0;

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        armStallTimer();
        received += value.byteLength;
        if (!out.write(value)) {
          await once(out, "drain");
        }
        onBytes?.(received, totalBytes);
      }
      await new Promise<void>((resolve, reject) => {
        out.end((err?: Error | null) => (err ? reject(err) : resolve()));
      });
    } catch (error) {
      out.destroy();
      await reader.cancel().catch(() => {});
      throw error;
    }

    if (received < 1024) {
      throw new Error(`Downloaded archive is unexpectedly small (${received} bytes)`);
    }

    if (totalBytes !== undefined && received !== totalBytes) {
      const err = new Error(
        `Download truncated — got ${formatBytes(received)} of ${formatBytes(totalBytes)}`,
      );
      (err as { retryable?: boolean }).retryable = true;
      throw err;
    }

    const stats = fs.statSync(targetPath);
    if (stats.size !== received) {
      throw new Error(`Archive write verification failed (${stats.size} != ${received})`);
    }

    return { bytes: received };
  } finally {
    if (stallTimer) clearTimeout(stallTimer);
  }
}

/**
 * Download with bounded retries. A partial file from a failed attempt is
 * discarded before the next one — the staging archive path is rewritten from
 * scratch every time, never appended to.
 */
async function downloadFile(
  url: string,
  targetPath: string,
  source: string,
  onProgress?: (event: CloneProgressEvent) => void,
): Promise<DownloadOutcome> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      onProgress?.({ phase: "download", source, attempt, receivedBytes: 0 });
      return await downloadFileOnce(url, targetPath, (receivedBytes, totalBytes) => {
        onProgress?.({ phase: "download", source, attempt, receivedBytes, totalBytes });
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      try {
        fs.rmSync(targetPath, { force: true });
      } catch {
        // noop — the next attempt truncates it anyway.
      }

      const retryable = (lastError as { retryable?: boolean }).retryable ?? true;
      if (!retryable || attempt === MAX_ATTEMPTS) break;

      onProgress?.({
        phase: "retry",
        source,
        attempt: attempt + 1,
        reason: describeNetworkError(lastError),
      });
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }

  throw new Error(describeNetworkError(lastError ?? new Error("unknown download failure")));
}

function extractTarball(archivePath: string, stagedDir: string): void {
  try {
    execFileSync("tar", ["-xzf", archivePath, "-C", stagedDir, "--strip-components=1"], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString().trim();
    throw new Error(
      `Failed to extract the template archive${stderr ? `: ${stderr.split("\n")[0]}` : ""}`,
    );
  }
}

function assertTarAvailable(): void {
  try {
    execFileSync("tar", ["--version"], { stdio: "ignore" });
  } catch {
    throw new Error(
      "`tar` was not found on PATH. Install it (macOS/Linux ship it; on Windows use Git Bash or WSL) and retry.",
    );
  }
}

// ---------------------------------------------------------------------------
// Staging → target
// ---------------------------------------------------------------------------

function directorySize(dir: string): number {
  let total = 0;
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        try {
          total += fs.statSync(full).size;
        } catch {
          // noop
        }
      }
    }
  };
  try {
    walk(dir);
  } catch {
    // noop
  }
  return total;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / 1_000_000;
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  if (mb < 1000) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1000).toFixed(2)} GB`;
}

/**
 * Copy a fully-prepared staging tree into the target, recording which
 * top-level entries are new so a rollback can remove exactly those.
 *
 * Files the template provides replace same-named files in the target (that is
 * what "scaffold files will be mixed in" means), but nothing the template does
 * not provide is ever removed.
 */
function mergeIntoTarget(stagedDir: string, targetDir: string): string[] {
  const before = new Set(safeReaddir(targetDir));

  fs.cpSync(stagedDir, targetDir, { recursive: true, force: true });

  return safeReaddir(targetDir).filter((name) => !before.has(name));
}

function safeReaddir(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

/** Prepare a template tree inside `stagedDir`. Never touches the target. */
async function stageTemplateSource(
  source: TemplateSource,
  stagedDir: string,
  archivePath: string,
  onProgress?: (event: CloneProgressEvent) => void,
): Promise<void> {
  const label = describeSource(source);

  onProgress?.({ phase: "resolve", source: label });

  try {
    const immutableRef = await resolveImmutableRef(source.repo, source.ref);
    await downloadFile(
      immutableTarballUrl(source.repo, immutableRef),
      archivePath,
      label,
      onProgress,
    );
  } catch (error) {
    if (!source.allowMutableFallback) {
      throw error;
    }
    await downloadFile(mutableTarballUrl(source.repo, source.ref), archivePath, label, onProgress);
  }

  onProgress?.({ phase: "extract", source: label });
  extractTarball(archivePath, stagedDir);

  if (source.applyIgnore) {
    onProgress?.({ phase: "strip", source: label });
    try {
      applyTemplateIgnore(stagedDir);
    } catch (error) {
      throw new Error(
        `Template downloaded, but .templateignore processing failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (safeReaddir(stagedDir).length === 0) {
    throw new Error("The extracted template was empty");
  }
}

export async function cloneTemplate(
  targetDir: string,
  options: CloneTemplateOptions = {},
): Promise<CloneTemplateResult> {
  const { onProgress } = options;

  assertTarAvailable();
  fs.mkdirSync(targetDir, { recursive: true });

  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-"));
  const archivePath = path.join(stagingRoot, "template.tar.gz");
  const stagedDir = path.join(stagingRoot, "tree");

  const freshStagedDir = (): void => {
    fs.rmSync(stagedDir, { recursive: true, force: true });
    fs.mkdirSync(stagedDir, { recursive: true });
  };

  try {
    // ---- Offline / headless path -------------------------------------------
    const localDir = localTemplateDir();
    if (localDir) {
      if (!fs.existsSync(localDir)) {
        throw new Error(`SAILOR_TEMPLATE_LOCAL_DIR does not exist: ${localDir}`);
      }
      const label = `local:${localDir}`;
      onProgress?.({ phase: "extract", source: label });
      freshStagedDir();
      copyTemplateDir(localDir, stagedDir);
      // A local checkout is "live source"-equivalent: apply .templateignore so
      // the resulting layout matches what the `main` GitHub source produces.
      onProgress?.({ phase: "strip", source: label });
      try {
        applyTemplateIgnore(stagedDir);
      } catch (error) {
        throw new Error(
          `Local template copied, but .templateignore processing failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      onProgress?.({ phase: "install", source: label });
      const bytes = directorySize(stagedDir);
      return { source: label, bytes, createdEntries: mergeIntoTarget(stagedDir, targetDir) };
    }

    // ---- Network path ------------------------------------------------------
    const explicitSource = process.env.SAILOR_TEMPLATE_SOURCE as "main" | "mirror" | undefined;
    const order: Array<keyof typeof TEMPLATE_SOURCES> =
      explicitSource === "main" ? ["main"] : ["mirror", "main"];

    const failures: string[] = [];

    for (const key of order) {
      const source = TEMPLATE_SOURCES[key];
      try {
        freshStagedDir();
        await stageTemplateSource(source, stagedDir, archivePath, onProgress);

        const label = describeSource(source);
        onProgress?.({ phase: "install", source: label });
        const bytes = directorySize(stagedDir);
        return { source: label, bytes, createdEntries: mergeIntoTarget(stagedDir, targetDir) };
      } catch (error) {
        failures.push(
          `  ${describeSource(source)} — ${error instanceof Error ? error.message : String(error)}`,
        );
        // Deliberately nothing else: the target has not been written to, and
        // the staging dir is rebuilt from scratch by the next iteration.
      }
    }

    throw new Error(
      `Could not download the Sailor template.\n\n` +
        `Tried:\n${failures.join("\n")}\n\n` +
        `The template is a large archive, so an unstable or filtered connection is the\n` +
        `usual cause. Things that help, in order:\n` +
        `  1. Retry — transient resets are common on big transfers.\n` +
        `  2. Scaffold from a local checkout (no download at all):\n` +
        `       git clone --depth 1 https://github.com/Nebutra/Sailor-Template.git\n` +
        `       SAILOR_TEMPLATE_LOCAL_DIR=./Sailor-Template npx create-sailor@latest\n` +
        `  3. Pin a different source: SAILOR_TEMPLATE_REPO / SAILOR_TEMPLATE_REF.\n\n` +
        `Nothing was written to your project directory.`,
    );
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}
