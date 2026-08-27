import { logger } from "@nebutra/logger";
import type { BetterAuthPlugin } from "better-auth/types";

/**
 * Load an optional better-auth plugin by name.
 *
 * The plugin path is built from a parameter rather than a string literal so
 * bundlers (Vite/Turbopack) skip static resolution — necessary because some
 * plugins (e.g. `passkey`) aren't always present in the installed better-auth
 * version's `exports` map. The runtime try/catch in callers handles a missing
 * module gracefully.
 */
export async function loadOptionalPlugin(name: string): Promise<unknown> {
  const path = `better-auth/plugins/${name}`;
  return import(/* @vite-ignore */ /* webpackIgnore: true */ path);
}

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
