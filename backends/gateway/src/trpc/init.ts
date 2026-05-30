import { AppError, UnauthorizedError } from "@nebutra/errors";
import { initTRPC, TRPCError } from "@trpc/server";
import { toRpcError } from "../lib/rpc-errors.js";
import type { TrpcContext } from "./context.js";

const t = initTRPC.context<TrpcContext>().create({
  /**
   * Attach the canonical `@nebutra/errors` envelope to every error so tRPC
   * clients receive the SAME `{ error: { code, message } }` body that REST
   * clients get from `app.onError`. The original domain error is on
   * `error.cause` once `errorMappingMiddleware` has wrapped it.
   */
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        api: toRpcError(error.cause ?? error).api,
      },
    };
  },
});

export const router = t.router;

/**
 * Funnels thrown `@nebutra/errors` `AppError`s through `toRpcError`, so a domain
 * `UnauthorizedError` / `NotFoundError` / `ValidationError` / … maps onto the
 * matching tRPC code (and HTTP status) exactly like the REST `app.onError`
 * handler. Non-`AppError` values propagate unchanged and tRPC reports them as
 * `INTERNAL_SERVER_ERROR` (no detail leak).
 *
 * NOTE: tRPC's `next()` does NOT reject when an inner middleware/resolver throws —
 * it RESOLVES with a `MiddlewareResult` (`{ ok: false, error }`) whose `error` is
 * a `TRPCError` (already coded `INTERNAL_SERVER_ERROR`) carrying the original
 * domain error on `error.cause`. A bare `try/catch` around `next()` therefore
 * never fires for downstream throws, which would leak a `401` domain error as a
 * `500`. We inspect the result instead and re-code it from the `AppError` on
 * `cause`. The direct `try/catch` still guards throws originating in THIS
 * middleware's own synchronous setup.
 */
const errorMappingMiddleware = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok) {
    const cause = result.error.cause;
    if (cause instanceof AppError) {
      throw new TRPCError({ code: toRpcError(cause).code, message: cause.message, cause });
    }
  }
  return result;
});

const baseProcedure = t.procedure.use(errorMappingMiddleware);

/** Public procedure — no authentication required. */
export const publicProcedure = baseProcedure;

/** Protected procedure — requires an authenticated user via tenant context. */
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.tenant?.userId) {
    throw new UnauthorizedError("Authentication required");
  }
  return next({ ctx });
});
