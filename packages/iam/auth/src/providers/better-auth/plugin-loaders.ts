import { logger } from "@nebutra/logger";
import type { BetterAuthPlugin } from "better-auth/types";

export async function loadBetterAuthOneTapPlugin(): Promise<BetterAuthPlugin | undefined> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return undefined;

  try {
    const pluginModule = (await import("better-auth/plugins")) as {
      oneTap?: (options: { clientId: string }) => BetterAuthPlugin;
    };
    if (!pluginModule.oneTap) return undefined;
    return pluginModule.oneTap({ clientId: process.env.GOOGLE_CLIENT_ID });
  } catch (error) {
    logger.warn("Better Auth: one-tap plugin not available — Google One Tap will not mount.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}
