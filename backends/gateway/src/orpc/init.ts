import { ORPCError, os } from "@orpc/server";
import type { OrpcContext } from "./context.js";

/**
 * Base oRPC instance typed with our tenant context.
 */
const base = os.$context<OrpcContext>();

/**
 * Public procedure — no authentication required.
 */
export const publicProcedure = base;

/**
 * Protected procedure — requires authenticated user via tenant context.
 */
export const protectedProcedure = base.use(async ({ context, next }) => {
  if (!context.tenant?.userId) {
    throw new ORPCError("UNAUTHORIZED", { message: "Authentication required" });
  }
  return next({ context });
});
