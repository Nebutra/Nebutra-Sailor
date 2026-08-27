import type { TwoFactorCapability } from "../../types";
import type { BetterAuthApi } from "./types";

export function buildTwoFactorCapability(
  getApi: () => Promise<BetterAuthApi>,
): TwoFactorCapability {
  return {
    async enroll(userId) {
      const api = await getApi();
      const fn = api.enableTwoFactor;
      if (!fn) throw new Error("Better Auth: enableTwoFactor endpoint missing.");
      const raw = (await fn({
        body: { userId },
      })) as {
        totpURI?: string;
        otpauthUrl?: string;
        secret?: string;
        backupCodes?: string[];
      } | null;
      const otpauthUrl = raw?.totpURI ?? raw?.otpauthUrl ?? "";
      return {
        secret: raw?.secret ?? "",
        otpauthUrl,
        backupCodes: raw?.backupCodes ?? [],
      };
    },

    async verify({ userId, code }) {
      const api = await getApi();
      const fn = api.verifyTOTP ?? api.verifyTwoFactor;
      if (!fn) return { ok: false };
      try {
        const raw = (await fn({
          body: { userId, code, totpCode: code },
        })) as { success?: boolean; ok?: boolean } | null;
        return { ok: raw?.success ?? raw?.ok ?? true };
      } catch {
        return { ok: false };
      }
    },

    async backupCodes(userId) {
      const api = await getApi();
      const fn = api.generateBackupCodes ?? api.viewBackupCodes;
      if (!fn) return { codes: [] };
      const raw = (await fn({ body: { userId } })) as {
        backupCodes?: string[];
        codes?: string[];
      } | null;
      return { codes: raw?.backupCodes ?? raw?.codes ?? [] };
    },

    async disable(userId) {
      const api = await getApi();
      const fn = api.disableTwoFactor;
      if (!fn) throw new Error("Better Auth: disableTwoFactor endpoint missing.");
      await fn({ body: { userId } });
    },
  };
}
