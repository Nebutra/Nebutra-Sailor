import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Mutex for tests that mutate brand-owned files in the real working tree.
 *
 * Two architecture tests do the same dance — snapshot a file, run
 * scripts/brand-apply.ts (which rewrites it in place), compare, restore:
 *
 *   readme-template-drift   README.md, README.zh-CN.md, README.ja.md,
 *                           .env.example, brand/src/metadata.ts,
 *                           design-tokens/tokens/core.json,
 *                           tokens/styles.css, theme/themes.css
 *   brand-metadata-drift    brand/src/metadata.ts, core.json
 *
 * Vitest runs test files in parallel, and brand-apply's own lock only
 * serializes the script runs — not the snapshot/compare/restore around them.
 * So one test could snapshot the other's post-run state, compare against a
 * snapshot the other had already restored over, or have its restore
 * overwritten mid-flight. That last one leaves real edits behind: this repo
 * carries a stash named "phantom README edits from arch suite run".
 *
 * It presented as readme-template-drift failing in a full-suite run and
 * passing in isolation — the signature of shared mutable state, not of a bug
 * in either test.
 *
 * Deliberately a DIFFERENT lock from brand-apply's. Holding brand-apply's own
 * lock across a section that then invokes brand-apply would deadlock: the
 * script waits up to 300s for a lock this process already holds. This one
 * serializes the tests against each other and leaves the script's lock alone.
 *
 * Same shape as the script's mutex — atomic mkdir, pid liveness, staleness
 * reclaim — because a test run that dies mid-section must not wedge the next
 * one.
 */

const LOCK_DIR = join(process.cwd(), "node_modules", ".cache", "nebutra-brand-worktree-test.lock");
const ACQUIRE_TIMEOUT_MS = 180_000;
const STALE_AFTER_MS = 5 * 60_000;

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function ownerAlive(): boolean {
  try {
    const pid = Number.parseInt(readFileSync(join(LOCK_DIR, "pid"), "utf-8"), 10);
    if (!Number.isInteger(pid) || pid <= 0) return false;
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means the pid exists and belongs to someone else — still alive.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function reclaimIfDead(): boolean {
  if (!ownerAlive()) {
    rmSync(LOCK_DIR, { force: true, recursive: true });
    return true;
  }

  try {
    if (Date.now() - statSync(LOCK_DIR).mtimeMs > STALE_AFTER_MS) {
      rmSync(LOCK_DIR, { force: true, recursive: true });
      return true;
    }
  } catch {
    // Gone between checks — the next mkdir attempt will win or wait.
    return true;
  }

  return false;
}

/**
 * Run `critical` with exclusive access to the brand-owned working-tree files.
 * Synchronous on purpose: the callers snapshot, shell out and restore
 * synchronously, and an async boundary here would reopen the window.
 */
export function withBrandWorktreeLock<T>(critical: () => T): T {
  const startedAt = Date.now();
  mkdirSync(dirname(LOCK_DIR), { recursive: true });

  for (;;) {
    try {
      mkdirSync(LOCK_DIR);
      writeFileSync(join(LOCK_DIR, "pid"), `${process.pid}\n`, "utf-8");
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (reclaimIfDead()) continue;
      if (Date.now() - startedAt > ACQUIRE_TIMEOUT_MS) {
        throw new Error(
          `Timed out waiting for the brand worktree test lock at ${LOCK_DIR}. ` +
            "Another architecture test is mutating brand-owned files; if nothing is " +
            "running, delete that directory.",
        );
      }
      sleepSync(50);
    }
  }

  try {
    return critical();
  } finally {
    rmSync(LOCK_DIR, { force: true, recursive: true });
  }
}
