import { AppError, UnauthorizedError } from "@nebutra/errors";
import { ORPCError, os } from "@orpc/server";
import { toRpcError } from "../lib/rpc-errors.js";
import type { OrpcContext } from "./context.js";

/**
 * Base oRPC instance typed with our tenant context.
 */
const base = os.$context<OrpcContext>();

/**
 * Funnels thrown `@nebutra/errors` `AppError`s through `toRpcError` → `ORPCError`
 * with the matching code, exact HTTP status, and the canonical REST envelope as
 * `data`. This keeps oRPC behaviourally identical to the REST `app.onError`
 * handler and the tRPC error middleware. Non-`AppError` values propagate
 * unchanged (oRPC surfaces them as a 500 with no detail leak).
 */
const guarded = base.use(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof AppError) {
      const rpc = toRpcError(error);
      throw new ORPCError(rpc.code, {
        message: error.message,
        status: rpc.status,
        data: rpc.api,
        cause: error,
      });
    }
    throw error;
  }
});

/**
 * Public procedure — no authentication required.
 */
export const publicProcedure = guarded;

/**
 * Protected procedure — requires an authenticated user via tenant context.
 */
export const protectedProcedure = guarded.use(async ({ context, next }) => {
  if (!context.tenant?.userId) {
    throw new UnauthorizedError("Authentication required");
  }
  return next({ context });
});
