/**
 * Per-canvas serialization.
 *
 * The source product used a process-global `asyncio.Lock` per canvas id —
 * correct for a single-user desktop app, wrong for a multi-tenant server
 * (one tenant's lock could be observed by another, and ids may collide).
 * Here the key is `tenantId:canvasId`, so isolation holds.
 *
 * Scope is still in-process: it serializes concurrent placements within one
 * server instance. Cross-instance correctness comes from the persist-then-
 * broadcast ordering in `service.ts` (last write wins on the row), not from
 * this lock. A distributed lock (Redis) is a documented future swap and does
 * not change the call sites.
 */

/** Tail of the promise chain per (tenant, canvas). */
const _tails = new Map<string, Promise<unknown>>();

function key(tenantId: string, canvasId: string): string {
  return `${tenantId}:${canvasId}`;
}

/**
 * Run `fn` with exclusive access to a single (tenant, canvas). Calls for the
 * same canvas run strictly in submission order; different canvases run freely.
 */
export async function withCanvasLock<T>(
  tenantId: string,
  canvasId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const k = key(tenantId, canvasId);
  const prev = _tails.get(k) ?? Promise.resolve();

  // Chain onto the previous holder; `.then(fn, fn)` runs `fn` whether the
  // prior critical section resolved or rejected, so one failure doesn't
  // deadlock the next waiter.
  const run = prev.then(fn, fn);

  // The new tail is `run` with its outcome neutralized, so the next waiter
  // never sees this section's value or error.
  const tail = run.then(
    () => undefined,
    () => undefined,
  );
  _tails.set(k, tail);

  try {
    return await run;
  } finally {
    // Bound the map: if no later caller replaced the tail, drop the entry.
    if (_tails.get(k) === tail) _tails.delete(k);
  }
}

/** Test helper — clears all lock chains. */
export function _resetCanvasLocks(): void {
  _tails.clear();
}
