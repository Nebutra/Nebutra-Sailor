import { logger } from "@nebutra/logger";
import type { MagicLinkCapability } from "../../types";
import type { BetterAuthApi } from "./types";

export function buildMagicLinkCapability(
  getApi: () => Promise<BetterAuthApi>,
): MagicLinkCapability {
  return {
    async send({ email, redirectTo }) {
      const api = await getApi();
      const fn = api.signInMagicLink ?? api.sendMagicLink;
      if (!fn) return { ok: false };
      try {
        await fn({
          body: { email, ...(redirectTo ? { callbackURL: redirectTo } : {}) },
        });
        return { ok: true };
      } catch (error) {
        logger.error("Better Auth magicLink.send failed", { email, error });
        return { ok: false };
      }
    },

    async verify(token) {
      const api = await getApi();
      const fn = api.magicLinkVerify ?? api.verifyMagicLink;
      if (!fn) {
        return {
          ok: false,
          error: { code: "unsupported", message: "Better Auth: magicLinkVerify endpoint missing." },
        };
      }
      try {
        const raw = (await fn({ query: { token } })) as {
          user?: { id?: string };
          redirect?: string;
        } | null;
        const userId = raw?.user?.id;
        return {
          ok: true,
          ...(userId ? { userId: String(userId) } : {}),
          ...(raw?.redirect ? { redirectTo: raw.redirect } : {}),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Magic link verification failed";
        return { ok: false, error: { code: "unknown", message } };
      }
    },
  };
}
