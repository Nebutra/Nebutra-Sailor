/**
 * Provider seam for the code-index — the `getX()` singleton accessor that
 * mirrors the house factory contract used by @nebutra/search /
 * @nebutra/queue (`createX` / `getX` / `setX` / `closeX`).
 *
 * ── Honest fail-closed default (READ THIS) ──────────────────────────────────
 * Unlike @nebutra/search there is **no auto-detection and there are NO bundled
 * adapters**. A semantic code index needs a concrete embedding provider and a
 * concrete vector backend; both are environment- and cost-sensitive choices
 * the *host* must make. They are injected, exactly like the agent-runtime
 * adapter pattern — this package never reaches for a vendor SDK that isn't
 * here, and it will not silently spin up an empty in-memory index that "looks
 * configured".
 *
 * Consequently `getCodeIndex()` throws {@link CodeIndexNotConfiguredError}
 * until the host has called {@link createCodeIndex} (or {@link setCodeIndex} in
 * tests). That throw is the correct, honest behaviour — not a bug.
 *
 * ── Lifecycle ───────────────────────────────────────────────────────────────
 *  - {@link createCodeIndex} — build an engine from host-injected ports AND
 *    install it as the process singleton; returns the engine.
 *  - {@link getCodeIndex} — return the singleton, or fail closed if unset.
 *  - {@link setCodeIndex} — test seam: install a pre-built / fake engine.
 *  - {@link closeCodeIndex} — clear the singleton back to the fail-closed
 *    default; idempotent and safe to call when never configured.
 *
 * The singleton is module-scoped, lazily set, and never created at import time
 * (no import-time side effects).
 */

import { type CodeIndexEngine, createIndexEngine, type IndexEngineConfig } from "./index-engine";
import { CodeIndexNotConfiguredError } from "./interfaces";

let singleton: CodeIndexEngine | null = null;

/**
 * Build a code-index engine from host-injected ports and install it as the
 * process-wide singleton. Returns the engine so the caller can also hold a
 * direct reference.
 *
 * Embedder / VectorStore / FileSource / IndexCacheStore / chunk are all
 * supplied by the host — this package bundles none of them.
 */
export function createCodeIndex(config: IndexEngineConfig): CodeIndexEngine {
  const engine = createIndexEngine(config);
  singleton = engine;
  return engine;
}

/**
 * Return the configured code-index engine.
 *
 * @throws {CodeIndexNotConfiguredError} if no engine has been configured. This
 * is the honest fail-closed default — there are no bundled adapters to fall
 * back to, so a silent empty index is never returned.
 */
export function getCodeIndex(): CodeIndexEngine {
  if (!singleton) {
    throw new CodeIndexNotConfiguredError(
      "code-index: not configured — call createCodeIndex({ embedder, store, " +
        "files, cache, chunk, ... }) with host-injected adapters first " +
        "(no embedder/vector-store is bundled by design)",
    );
  }
  return singleton;
}

/**
 * Install a pre-built engine as the singleton (test seam). Replaces any
 * previously installed engine.
 */
export function setCodeIndex(engine: CodeIndexEngine): void {
  singleton = engine;
}

/**
 * Clear the singleton, returning the seam to its fail-closed default. After
 * this, {@link getCodeIndex} throws again until reconfigured. Idempotent.
 */
export async function closeCodeIndex(): Promise<void> {
  singleton = null;
}
