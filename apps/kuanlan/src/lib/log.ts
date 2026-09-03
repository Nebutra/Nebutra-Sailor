import { logger } from "@nebutra/logger";

/**
 * One logger for this app, bound so every line says where it came from.
 *
 * What goes in a line: the pseudonymous `userId`, the SKU and size, how long a
 * step took, and which step gave up. What never goes in: the email (the session
 * has one and it is not needed to answer an operational question), the uploaded
 * portrait, and the shoot brief — the SKU system prompts stay out of the browser
 * and there is no reason for them to sit in a log either.
 */
export const log = logger.child({ app: "kuanlan" });

export function shootLog(userId: string, skuId?: string, sizeId?: string) {
  return log.child({
    route: "moments/id-photo",
    userId,
    ...(skuId ? { skuId } : {}),
    ...(sizeId ? { sizeId } : {}),
  });
}
