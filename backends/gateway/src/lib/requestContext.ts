/**
 * AsyncLocalStorage-based request context.
 *
 * Propagates request-scoped values (requestId, tenantId, userId) through the
 * entire async call chain — including DB queries, service clients, and helpers —
 * without threading these through function parameters.
 *
 * Usage in any module:
 *   import { requestContext } from "./lib/requestContext.js";
 *   const ctx = requestContext.getStore();
 *   if (ctx) logger.info("doing thing", { requestId: ctx.requestId });
 *
 * Wired in index.ts via runWithContext() before the main request pipeline.
 */

import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  requestId?: string;
  tenantId?: string;
  userId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Run `fn` inside an AsyncLocalStorage context seeded with `initial`.
 * The context is mutable — downstream middleware can add tenantId/userId
 * by calling `requestContext.getStore()` and mutating the object.
 */
export function runWithContext(initial: RequestContext, fn: () => Promise<void>): Promise<void> {
  return requestContext.run({ ...initial }, fn);
}

/**
 * Convenience: read the current request context.
 * Returns undefined if called outside of a request (e.g., background jobs).
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}
