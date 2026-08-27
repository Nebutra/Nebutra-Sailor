import type { PasskeyCapability } from "../../types";
import type { BetterAuthApi } from "./types";

export function buildPasskeysCapability(getApi: () => Promise<BetterAuthApi>): PasskeyCapability {
  return {
    async register({ userId, name }) {
      const api = await getApi();
      // Better Auth's passkey plugin exposes `generatePasskeyRegistrationOptions`
      // for enrollment; fall back to `generatePasskeyAuthenticationOptions` for
      // older builds that conflate the two.
      const fn = api.generatePasskeyRegistrationOptions ?? api.generatePasskeyAuthenticationOptions;
      if (!fn) throw new Error("Better Auth: passkey registration endpoint missing.");
      const raw = (await fn({
        body: { userId, ...(name ? { name } : {}) },
      })) as { challenge?: string; options?: unknown } | null;
      if (!raw?.challenge) {
        throw new Error("Better Auth: passkey registration returned no challenge.");
      }
      return { challenge: String(raw.challenge), options: raw.options ?? raw };
    },

    async authenticate({ challenge, response }) {
      const api = await getApi();
      const fn = api.verifyPasskey ?? api.signInPasskey;
      if (!fn) {
        return {
          ok: false,
          error: { code: "unsupported", message: "Better Auth: verifyPasskey endpoint missing." },
        };
      }
      try {
        const raw = (await fn({
          body: { challenge, response },
        })) as { user?: { id?: string } } | null;
        const userId = raw?.user?.id;
        return {
          ok: true,
          ...(userId ? { userId: String(userId) } : {}),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Passkey authentication failed";
        return { ok: false, error: { code: "unknown", message } };
      }
    },

    async list(userId) {
      const api = await getApi();
      const fn = api.listPasskeys;
      if (!fn) return [];
      const raw = (await fn({ query: { userId } })) as Array<Record<string, unknown>> | null;
      if (!raw) return [];
      return raw.map((p) => {
        const name = typeof p.name === "string" ? p.name : undefined;
        return {
          id: String(p.id),
          ...(name !== undefined ? { name } : {}),
          createdAt: p.createdAt ? new Date(p.createdAt as string | number) : new Date(),
        };
      });
    },

    async revoke(passkeyId) {
      const api = await getApi();
      const fn = api.deletePasskey ?? api.revokePasskey;
      if (!fn) throw new Error("Better Auth: deletePasskey endpoint missing.");
      await fn({ body: { passkeyId, id: passkeyId } });
    },
  };
}
