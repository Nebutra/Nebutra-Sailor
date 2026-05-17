/**
 * Per-(tenant, resource) serialization.
 *
 * A process-global lock keyed only by resource id would be correct for a
 * single-user desktop app but wrong for a multi-tenant server (one tenant's
 * lock could be observed by another, and ids may collide). Here the key is
 * `tenantId:resourceId`, so isolation holds.
 *
 * Scope is in-process: it serializes concurrent mutations of one resource
 * within a single server instance. Cross-instance correctness comes from a
 * persist-then-broadcast ordering at the call site (last write wins on the
 * row), not from this lock. Swapping to a distributed lock (Redis/etcd) is a
 * documented future change that does NOT alter any call site — replace the
 * body of `withTenantLock` here only.
 */

/** Tail of the promise chain per (tenant, resource). */
const _tails = new Map<string, Promise<unknown>>();

function key(tenantId: string, resourceId: string): string {
  return `${tenantId}:${resourceId}`;
}

/**
 * Run `fn` with exclusive access to a single (tenant, resource). Calls for the
 * same resource run strictly in submission order; different resources (or the
 * same resource under different tenants) run freely in parallel.
 */
export async function withTenantLock<T>(
  tenantId: string,
  resourceId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const k = key(tenantId, resourceId);
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
export function _resetTenantLocks(): void {
  _tails.clear();
}
