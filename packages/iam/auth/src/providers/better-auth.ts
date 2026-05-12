/**
 * Better Auth provider implementation.
 *
 * Wraps the `better-auth` library to implement the unified AuthProvider
 * interface. Requires a PostgreSQL database (via Prisma) and optionally
 * supports OAuth social providers and the organization plugin.
 *
 * Environment variables:
 * - BETTER_AUTH_SECRET (required)
 * - BETTER_AUTH_URL (optional, base URL for auth endpoints)
 * - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (optional, enables Google OAuth)
 * - GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET (optional, enables GitHub OAuth)
 */

import { logger } from "@nebutra/logger";
import type { BetterAuthPlugin } from "better-auth/types";
import type {
  AuthCapabilities,
  AuthConfig,
  AuthProvider,
  CreateOrgInput,
  CreateUserInput,
  MagicLinkCapability,
  Organization,
  OrganizationCapability,
  PasskeyCapability,
  Session,
  SetActiveResult,
  SignInMethod,
  SignInResult,
  TwoFactorCapability,
  User,
} from "../types";

// Loose alias used inside builders — Better Auth's `auth.api` is a record of
// dynamically generated endpoint handlers; the precise types vary per plugin
// and are bridged at runtime.
type BetterAuthApi = Record<string, ((...args: unknown[]) => Promise<unknown>) | undefined>;

/**
 * Sentinel auth.api method names mapped to capabilities.
 *
 * Better Auth surfaces plugin functionality as additional methods on
 * `auth.api` after plugins are registered. We probe by checking for the
 * presence of one canonical method per plugin. If you add a new plugin
 * and want to flip a capability, extend this map.
 *
 * Exported for tests so the probe contract is documented + verifiable.
 */
export const BETTER_AUTH_CAPABILITY_PROBES = {
  organizations: ["listOrganizations", "createOrganization", "getFullOrganization"],
  passkeys: ["signInPasskey", "generatePasskeyAuthenticationOptions", "verifyPasskey"],
  twoFactor: ["verifyTwoFactor", "enableTwoFactor", "disableTwoFactor", "verifyTOTP"],
  magicLink: ["signInMagicLink", "verifyMagicLink"],
} as const;

/**
 * Probe a live Better Auth instance to see which plugins actually mounted.
 *
 * Better Auth's plugin loading is best-effort — if a plugin module is missing
 * (e.g. `better-auth/plugins/passkey` not in the `exports` map) we log a
 * warning and continue. The probe checks `auth.api` for the presence of
 * sentinel method names so the resulting `AuthCapabilities` reflects the
 * actual runtime surface, not config intent. Impersonation is currently not
 * available as a first-class Better Auth plugin → always `false`.
 */
export function probeBetterAuthCapabilities(
  auth: { api?: Record<string, unknown> } | null | undefined,
): AuthCapabilities {
  const api = (auth?.api ?? {}) as Record<string, unknown>;
  const has = (names: readonly string[]): boolean =>
    names.some((name) => typeof api[name] === "function");
  return {
    organizations: has(BETTER_AUTH_CAPABILITY_PROBES.organizations),
    passkeys: has(BETTER_AUTH_CAPABILITY_PROBES.passkeys),
    twoFactor: has(BETTER_AUTH_CAPABILITY_PROBES.twoFactor),
    magicLink: has(BETTER_AUTH_CAPABILITY_PROBES.magicLink),
    impersonation: false,
  };
}

const ALL_FALSE_CAPABILITIES: AuthCapabilities = Object.freeze({
  passkeys: false,
  organizations: false,
  twoFactor: false,
  magicLink: false,
  impersonation: false,
});

// ─── Helpers ───

/** Map a Better Auth session+user response to our canonical Session type. */
function mapSession(
  raw: { session: Record<string, unknown>; user: Record<string, unknown> } | null,
): Session | null {
  if (!raw) return null;
  const { session, user } = raw;
  return {
    userId: String(session.userId ?? user.id ?? ""),
    email: (user.email as string) ?? undefined,
    expiresAt: session.expiresAt
      ? new Date(session.expiresAt as string | number)
      : new Date(Date.now() + 3_600_000),
  };
}

/**
 * Load an optional better-auth plugin by name.
 *
 * The plugin path is built from a parameter rather than a string literal so
 * bundlers (Vite/Turbopack) skip static resolution — necessary because some
 * plugins (e.g. `passkey`) aren't always present in the installed better-auth
 * version's `exports` map. The runtime try/catch in callers handles a missing
 * module gracefully.
 */
async function loadOptionalPlugin(name: string): Promise<unknown> {
  const path = `better-auth/plugins/${name}`;
  return import(/* @vite-ignore */ /* webpackIgnore: true */ path);
}

/** Map a Better Auth user record to our canonical User type. */
function mapUser(raw: Record<string, unknown> | null): User | null {
  if (!raw) return null;
  return {
    id: String(raw.id),
    email: (raw.email as string) ?? undefined,
    phone: (raw.phone as string) ?? undefined,
    name: (raw.name as string) ?? undefined,
    imageUrl: (raw.image as string) ?? undefined,
    createdAt: raw.createdAt ? new Date(raw.createdAt as string | number) : new Date(),
  };
}

/**
 * Normalize a Better Auth organization record to our canonical Organization.
 *
 * Better Auth's org plugin returns records with optional `metadata` blobs
 * that some installs use to carry plan info. We treat that as a string when
 * present, falling back to "FREE".
 */
function normalizeOrganization(raw: Record<string, unknown>): Organization {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    slug: String(raw.slug ?? ""),
    plan:
      typeof raw.metadata === "string"
        ? raw.metadata
        : typeof raw.plan === "string"
          ? raw.plan
          : "FREE",
    createdAt: raw.createdAt ? new Date(raw.createdAt as string | number) : new Date(),
  };
}

// ─── Capability builders (Phase 1.3) ───
//
// Each builder maps the canonical AuthProvider capability shape onto Better
// Auth's plugin endpoints surfaced via `auth.api`. The builders are called
// only when the capability probe confirmed the corresponding plugin is
// mounted, so callers can assume the named endpoints exist.

export function buildOrganizationsCapability(
  getApi: () => Promise<BetterAuthApi>,
): OrganizationCapability {
  return {
    async create({ name, slug, metadata }) {
      const api = await getApi();
      const fn = api.createOrganization;
      if (!fn) throw new Error("Better Auth: createOrganization endpoint missing.");
      const raw = (await fn({
        body: {
          name,
          slug: slug ?? name.toLowerCase().replace(/\s+/g, "-"),
          ...(metadata !== undefined ? { metadata } : {}),
        },
      })) as Record<string, unknown> | null;
      if (!raw) throw new Error("Better Auth: createOrganization returned null.");
      return normalizeOrganization(raw);
    },

    async list(userId) {
      const api = await getApi();
      const fn = api.listOrganizations;
      if (!fn) return [];
      const raw = (await fn({ query: { userId } })) as Array<Record<string, unknown>> | null;
      if (!raw) return [];
      return raw.map(normalizeOrganization);
    },

    async setActive(req, organizationId): Promise<SetActiveResult> {
      const api = await getApi();
      const fn = api.setActiveOrganization;
      if (!fn) {
        throw new Error("Better Auth: setActiveOrganization endpoint missing.");
      }
      // BA expects headers for session resolution and body for the org id.
      // `returnHeaders: true` flips BA's API into the `{ headers, response }`
      // shape so we can forward its `Set-Cookie` (rotating the session token
      // to bind it to the new active org) up to the HTTP layer.
      const raw = (await fn({
        headers: req.headers,
        body: { organizationId },
        returnHeaders: true,
      })) as { headers?: unknown; response?: unknown } | null | undefined;

      // Normalize: BA returns a Headers instance in normal builds, but some
      // transports / older versions surface a plain record. Either way we
      // hand back a real Headers so callers can `new Response(..., result)`.
      const rawHeaders = raw?.headers;
      const headers =
        rawHeaders instanceof Headers
          ? rawHeaders
          : new Headers((rawHeaders as Record<string, string> | undefined) ?? {});
      return { headers };
    },

    async invite({ email, organizationId, role }) {
      const api = await getApi();
      const fn = api.createInvitation;
      if (!fn) {
        throw new Error("Better Auth: createInvitation endpoint missing.");
      }
      const raw = (await fn({
        body: {
          email,
          organizationId,
          ...(role ? { role } : {}),
        },
      })) as { id?: string; invitationId?: string } | null;
      const invitationId = raw?.id ?? raw?.invitationId;
      if (!invitationId) {
        throw new Error("Better Auth: createInvitation returned no invitation id.");
      }
      return { invitationId: String(invitationId) };
    },

    async acceptInvite(invitationId, userId) {
      const api = await getApi();
      const fn = api.acceptInvitation;
      if (!fn) {
        throw new Error("Better Auth: acceptInvitation endpoint missing.");
      }
      const raw = (await fn({
        body: { invitationId, userId },
      })) as { organizationId?: string; organization?: { id?: string } } | null;
      const organizationId = raw?.organizationId ?? raw?.organization?.id;
      if (!organizationId) {
        throw new Error("Better Auth: acceptInvitation returned no organizationId.");
      }
      return { organizationId: String(organizationId) };
    },

    async members(organizationId) {
      const api = await getApi();
      const fn = api.listMembers;
      if (!fn) return [];
      const raw = (await fn({ query: { organizationId } })) as Array<
        Record<string, unknown>
      > | null;
      if (!raw) return [];
      return raw.map((m) => ({
        userId: String(m.userId ?? m.id ?? ""),
        role: String(m.role ?? ""),
        joinedAt: m.createdAt
          ? new Date(m.createdAt as string | number)
          : m.joinedAt
            ? new Date(m.joinedAt as string | number)
            : new Date(),
      }));
    },

    async removeMember(organizationId, userId) {
      const api = await getApi();
      const fn = api.removeMember;
      if (!fn) throw new Error("Better Auth: removeMember endpoint missing.");
      await fn({ body: { organizationId, userId, memberIdOrEmail: userId } });
    },

    async updateMemberRole(organizationId, userId, role) {
      const api = await getApi();
      const fn = api.updateMemberRole;
      if (!fn) throw new Error("Better Auth: updateMemberRole endpoint missing.");
      await fn({ body: { organizationId, userId, role, memberId: userId } });
    },
  };
}

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

/**
 * Create a Better Auth provider instance.
 *
 * The auth instance is configured lazily — `betterAuth()` and the Prisma
 * adapter are imported dynamically so that projects not using Better Auth
 * never pull in the dependency.
 */
export function createBetterAuthProvider(config: AuthConfig): AuthProvider {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET environment variable is required for the Better Auth provider. " +
        "Generate one with: openssl rand -base64 32",
    );
  }

  // Build social providers object conditionally
  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    socialProviders.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }

  if (Object.keys(socialProviders).length === 0) {
    logger.info(
      "Better Auth: no OAuth providers configured — only email/password login is available. " +
        "Set GOOGLE_CLIENT_ID/SECRET or GITHUB_CLIENT_ID/SECRET to enable social login.",
    );
  }

  // ── Lazy auth instance ──
  // We defer creation until first use so that import-time errors are avoided
  // when the database is not yet available (e.g. during build).
  let authInstance: Awaited<ReturnType<typeof initAuth>> | null = null;

  async function initAuth() {
    const { betterAuth } = await import("better-auth");
    const { prismaAdapter } = await import("better-auth/adapters/prisma");

    // Plugin paths are routed through `loadOptionalPlugin` so that bundlers
    // (Vite/Turbopack) treat them as runtime-only — necessary because some
    // plugin paths (e.g. `passkey`) may be missing from the installed
    // better-auth's `exports` map. Static resolution would fail at build
    // time even though the runtime try/catch is meant to handle it.

    // Dynamically import the organization plugin — it may not be available
    let orgPlugin: BetterAuthPlugin | undefined;
    try {
      const orgModule = await loadOptionalPlugin("organization");
      orgPlugin = (orgModule as { organization: () => BetterAuthPlugin }).organization();
    } catch {
      logger.warn(
        "Better Auth: organization plugin not available — multi-tenant features will be stubbed.",
      );
    }

    // Dynamically import the twoFactor plugin — gracefully degrade if absent
    let twoFactorPlugin: BetterAuthPlugin | undefined;
    try {
      const twoFactorModule = await loadOptionalPlugin("two-factor");
      twoFactorPlugin = (twoFactorModule as { twoFactor: () => BetterAuthPlugin }).twoFactor();
    } catch {
      logger.warn(
        "Better Auth: two-factor plugin not available — 2FA endpoints (/api/auth/two-factor/*) will not be exposed.",
      );
    }

    // Dynamically import the passkey plugin — gracefully degrade if absent.
    // better-auth 1.5.6 does not ship `./plugins/passkey` in its `exports`
    // map, so the runtime try/catch handles the missing module and logs a warning.
    let passkeyPlugin: BetterAuthPlugin | undefined;
    try {
      const passkeyModule = await loadOptionalPlugin("passkey");
      passkeyPlugin = (passkeyModule as { passkey: () => BetterAuthPlugin }).passkey();
    } catch {
      logger.warn(
        "Better Auth: passkey plugin not available — WebAuthn endpoints (/api/auth/passkey/*) will not be exposed.",
      );
    }

    // Dynamically import the magic-link plugin — gracefully degrade if absent
    let magicLinkPlugin: BetterAuthPlugin | undefined;
    try {
      const magicLinkModule = (await loadOptionalPlugin("magic-link")) as {
        magicLink: (opts: {
          sendMagicLink: (args: { email: string; url: string }) => Promise<void>;
        }) => BetterAuthPlugin;
      };
      // The magic-link plugin requires a `sendMagicLink` callback. When not configured,
      // we register a no-op that logs a warning so endpoints still mount but operators
      // know to wire a real email transport.
      magicLinkPlugin = magicLinkModule.magicLink({
        sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
          try {
            const { sendMagicLinkEmail } = await import("@nebutra/email");
            await sendMagicLinkEmail({ to: email, magicLinkUrl: url });
          } catch {
            logger.warn(
              "Better Auth: @nebutra/email not available for magic-link. Install it or configure a real email transport.",
              { email, url },
            );
          }
        },
      });
    } catch {
      logger.warn(
        "Better Auth: magic-link plugin not available — magic-link endpoints (/api/auth/sign-in/magic-link, /api/auth/magic-link/verify) will not be exposed.",
      );
    }

    const plugins: BetterAuthPlugin[] = [];
    if (orgPlugin) plugins.push(orgPlugin);
    if (twoFactorPlugin) plugins.push(twoFactorPlugin);
    if (passkeyPlugin) plugins.push(passkeyPlugin);
    if (magicLinkPlugin) plugins.push(magicLinkPlugin);

    const prismaClient = await getPrismaClient(config);

    // Audit hooks — bridge Better Auth's `databaseHooks` into @nebutra/audit so
    // that `auth.password.changed` / `auth.2fa.enabled` / `auth.2fa.disabled`
    // are emitted even though they aren't path-distinguishable at the
    // /api/auth/[...all] route. See packages/iam/auth/src/audit-events.ts.
    const { buildAuditDatabaseHooks } = await import("../audit-events");
    const databaseHooks = buildAuditDatabaseHooks() as Record<string, unknown>;

    const auth = betterAuth({
      secret,
      baseURL: process.env.BETTER_AUTH_URL,
      emailAndPassword: { enabled: true },
      socialProviders,
      database: prismaAdapter(
        // PrismaClient is expected to be available globally or passed via config
        // For now we dynamically import from @nebutra/db
        prismaClient as Parameters<typeof prismaAdapter>[0],
        {
          provider: "postgresql",
          // Map Better Auth's default model names to our Prisma schema model names.
          // Our Prisma schema uses AuthUser/AuthAccount/AuthSession/AuthVerification
          // (mapped to auth_users/auth_accounts/auth_sessions/auth_verifications tables).
          usePlural: false,
        },
      ),
      plugins,
      databaseHooks,
      // Map Better Auth's internal model names to our custom Prisma model names
      // so the Prisma adapter queries the correct tables.
      user: { modelName: "AuthUser" },
      session: { modelName: "AuthSession" },
      account: { modelName: "AuthAccount" },
      verification: { modelName: "AuthVerification" },
      ...(config.options as Record<string, unknown> | undefined),
    });

    return auth;
  }

  async function getAuth() {
    if (!authInstance) {
      authInstance = await initAuth();
    }
    return authInstance;
  }

  // Capabilities are cached after the first successful initAuth() so reads are
  // synchronous. Before init runs we return the all-false default — apps must
  // tolerate that and re-read after the first server-side call. Storybook /
  // build-time imports therefore never trip lazy DB resolution just to read
  // capabilities.
  let cachedCapabilities: AuthCapabilities = ALL_FALSE_CAPABILITIES;

  // Best-effort eager probe: fire-and-forget so the first network call
  // doesn't pay the latency cost of init. Failures are intentionally
  // swallowed — capabilities stays at the safe default and we'll try again
  // on the next read path that calls getAuth().
  void (async () => {
    try {
      const auth = await getAuth();
      cachedCapabilities = Object.freeze(probeBetterAuthCapabilities(auth));
    } catch {
      // Build/test environments without a DB hit this path — that's fine.
    }
  })();

  // Helper used by capability builders to reach the BA api surface.
  async function getApi(): Promise<BetterAuthApi> {
    const auth = await getAuth();
    return auth.api as BetterAuthApi;
  }

  // Lazy singletons for the capability shapes — built once when the eager
  // probe confirms the corresponding plugin is mounted, then memoized.
  let orgsShape: OrganizationCapability | undefined;
  let passkeysShape: PasskeyCapability | undefined;
  let twoFactorShape: TwoFactorCapability | undefined;
  let magicLinkShape: MagicLinkCapability | undefined;

  return {
    provider: "better-auth",

    get capabilities(): Readonly<AuthCapabilities> {
      return cachedCapabilities;
    },

    // Optional capability shapes — present only when the probe confirms the
    // corresponding plugin is mounted on `auth.api`. Consumers must
    // type-narrow via `capabilities.<feature>` first.

    get organizations(): OrganizationCapability | undefined {
      if (!cachedCapabilities.organizations) return undefined;
      if (!orgsShape) orgsShape = buildOrganizationsCapability(getApi);
      return orgsShape;
    },

    get passkeys(): PasskeyCapability | undefined {
      if (!cachedCapabilities.passkeys) return undefined;
      if (!passkeysShape) passkeysShape = buildPasskeysCapability(getApi);
      return passkeysShape;
    },

    get twoFactor(): TwoFactorCapability | undefined {
      if (!cachedCapabilities.twoFactor) return undefined;
      if (!twoFactorShape) twoFactorShape = buildTwoFactorCapability(getApi);
      return twoFactorShape;
    },

    get magicLink(): MagicLinkCapability | undefined {
      if (!cachedCapabilities.magicLink) return undefined;
      if (!magicLinkShape) magicLinkShape = buildMagicLinkCapability(getApi);
      return magicLinkShape;
    },

    async getSession(request) {
      const auth = await getAuth();
      if (!request) {
        logger.warn("Better Auth getSession: a Request object is required to resolve the session.");
        return null;
      }
      try {
        const result = await auth.api.getSession({ headers: request.headers });
        return mapSession(
          result as { session: Record<string, unknown>; user: Record<string, unknown> } | null,
        );
      } catch (error) {
        logger.error("Better Auth getSession failed", { error });
        return null;
      }
    },

    async getUser(userId) {
      const auth = await getAuth();
      try {
        const ctx = await auth.$context;
        const adapter = ctx.adapter;
        const raw = await adapter.findOne<Record<string, unknown>>({
          model: "user",
          where: [{ field: "id", value: userId }],
        });
        return mapUser(raw);
      } catch (error) {
        logger.error("Better Auth getUser failed", { userId, error });
        return null;
      }
    },

    async createUser(data: CreateUserInput) {
      const auth = await getAuth();
      try {
        // Use the sign-up endpoint for email/password users
        if (data.email && data.password) {
          const result = await auth.api.signUpEmail({
            body: {
              email: data.email,
              password: data.password,
              name: data.name ?? "",
            },
          });
          const user = mapUser(
            ((result as Record<string, unknown>).user as Record<string, unknown>) ??
              (result as Record<string, unknown>),
          );
          if (!user) {
            throw new Error("Failed to create user — no user returned from sign-up");
          }
          return user;
        }

        // For users without email/password, insert directly via the adapter
        const ctx = await auth.$context;
        const adapter = ctx.adapter;
        const raw = await adapter.create<Record<string, unknown>>({
          model: "user",
          data: {
            email: data.email ?? null,
            name: data.name ?? null,
            image: data.imageUrl ?? null,
          },
        });
        const user = mapUser(raw);
        if (!user) {
          throw new Error("Failed to create user — adapter returned null");
        }
        return user;
      } catch (error) {
        logger.error("Better Auth createUser failed", { error });
        throw error instanceof Error ? error : new Error("Failed to create user via Better Auth");
      }
    },

    async getOrganization(orgId) {
      const auth = await getAuth();
      try {
        if (!("getFullOrganization" in auth.api)) {
          logger.warn(
            "Better Auth: organization plugin is not enabled — getOrganization returns null. " +
              "Add the organization plugin to enable multi-tenant support.",
          );
          return null;
        }
        const api = auth.api as Record<
          string,
          ((...args: unknown[]) => Promise<unknown>) | undefined
        >;
        const getFullOrg = api.getFullOrganization;
        if (!getFullOrg) return null;
        const raw = (await getFullOrg({ query: { organizationId: orgId } })) as Record<
          string,
          unknown
        > | null;
        if (!raw) return null;
        return {
          id: String(raw.id),
          name: String(raw.name ?? ""),
          slug: String(raw.slug ?? ""),
          plan: String(raw.metadata ?? "FREE"),
          createdAt: raw.createdAt ? new Date(raw.createdAt as string | number) : new Date(),
        } satisfies Organization;
      } catch (error) {
        logger.error("Better Auth getOrganization failed", { orgId, error });
        return null;
      }
    },

    async getUserOrganizations(userId) {
      const auth = await getAuth();
      try {
        if (!("listOrganizations" in auth.api)) {
          logger.warn(
            "Better Auth: organization plugin is not enabled — getUserOrganizations returns []. " +
              "Add the organization plugin to enable multi-tenant support.",
          );
          return [];
        }
        const api = auth.api as Record<
          string,
          ((...args: unknown[]) => Promise<unknown>) | undefined
        >;
        const listOrgs = api.listOrganizations;
        if (!listOrgs) return [];
        const raw = (await listOrgs({ query: { userId } })) as Array<
          Record<string, unknown>
        > | null;
        if (!raw) return [];
        return raw.map((org) => ({
          id: String(org.id),
          name: String(org.name ?? ""),
          slug: String(org.slug ?? ""),
          plan: String(org.metadata ?? "FREE"),
          createdAt: org.createdAt ? new Date(org.createdAt as string | number) : new Date(),
        })) satisfies Organization[];
      } catch (error) {
        logger.error("Better Auth getUserOrganizations failed", { userId, error });
        return [];
      }
    },

    async createOrganization(data: CreateOrgInput) {
      const auth = await getAuth();
      try {
        if (!("createOrganization" in auth.api)) {
          throw new Error(
            "Better Auth: organization plugin is not enabled. " +
              "Add the organization plugin to enable multi-tenant support.",
          );
        }
        const api = auth.api as Record<
          string,
          ((...args: unknown[]) => Promise<unknown>) | undefined
        >;
        const createOrg = api.createOrganization;
        if (!createOrg) {
          throw new Error(
            "Better Auth: createOrganization API endpoint not found on auth instance.",
          );
        }
        const raw = (await createOrg({
          body: {
            name: data.name,
            slug: data.slug ?? data.name.toLowerCase().replace(/\s+/g, "-"),
          },
        })) as Record<string, unknown>;
        return {
          id: String(raw.id),
          name: String(raw.name ?? ""),
          slug: String(raw.slug ?? ""),
          plan: data.plan ?? "FREE",
          createdAt: raw.createdAt ? new Date(raw.createdAt as string | number) : new Date(),
        } satisfies Organization;
      } catch (error) {
        logger.error("Better Auth createOrganization failed", { error });
        throw error instanceof Error
          ? error
          : new Error("Failed to create organization via Better Auth");
      }
    },

    async signIn(method: SignInMethod): Promise<SignInResult> {
      try {
        const auth = await getAuth();
        // Refresh the cached probe now that the api surface is materialized.
        cachedCapabilities = Object.freeze(probeBetterAuthCapabilities(auth));
        const api = auth.api as Record<
          string,
          ((...args: unknown[]) => Promise<unknown>) | undefined
        >;

        switch (method.type) {
          case "email-password": {
            const signInEmail = api.signInEmail;
            if (!signInEmail) {
              return {
                ok: false,
                error: {
                  code: "unsupported",
                  message: "Better Auth: signInEmail endpoint not available on auth.api.",
                },
              };
            }
            const raw = (await signInEmail({
              body: { email: method.email, password: method.password },
            })) as { user?: { id?: string }; redirect?: string } | null;
            const userId = raw?.user?.id;
            return {
              ok: true,
              ...(userId ? { userId } : {}),
              ...(raw?.redirect ? { redirectTo: raw.redirect } : {}),
            };
          }
          case "oauth": {
            const signInSocial = api.signInSocial;
            if (!signInSocial) {
              return {
                ok: false,
                error: {
                  code: "unsupported",
                  message: "Better Auth: social sign-in not configured.",
                },
              };
            }
            const raw = (await signInSocial({
              body: {
                provider: method.provider,
                callbackURL: method.redirectUrl,
              },
            })) as { url?: string; redirect?: string } | null;
            const redirectTo = raw?.url ?? raw?.redirect;
            return {
              ok: true,
              ...(redirectTo ? { redirectTo } : {}),
            };
          }
          case "phone": {
            return {
              ok: false,
              error: {
                code: "unsupported",
                message:
                  "Better Auth: phone sign-in is not wired in this build. " +
                  "Add the phone plugin and re-attempt.",
              },
            };
          }
          default: {
            // Exhaustiveness guard
            const _exhaustive: never = method;
            return {
              ok: false,
              error: {
                code: "unsupported",
                message: `Unknown sign-in method: ${String(_exhaustive)}`,
              },
            };
          }
        }
      } catch (error) {
        logger.error("Better Auth signIn failed", { type: method.type, error });
        const message = error instanceof Error ? error.message : "Sign-in failed";
        return {
          ok: false,
          error: {
            code: /password|credential/i.test(message) ? "invalid-credentials" : "unknown",
            message,
          },
        };
      }
    },

    async signOut(request: Request): Promise<void> {
      try {
        const auth = await getAuth();
        const api = auth.api as Record<
          string,
          ((...args: unknown[]) => Promise<unknown>) | undefined
        >;
        const signOutFn = api.signOut;
        if (!signOutFn) {
          logger.warn("Better Auth: signOut endpoint not available on auth.api.");
          return;
        }
        await signOutFn({ headers: request.headers });
      } catch (error) {
        logger.error("Better Auth signOut failed", { error });
      }
    },

    middleware() {
      // Return an async handler that delegates to Better Auth's request handler.
      // The handler processes /api/auth/* routes (sign-in, sign-up, callback, etc.).
      return async (req: Request): Promise<Response | undefined> => {
        const auth = await getAuth();
        return auth.handler(req);
      };
    },

    async handleWebhook(_request) {
      logger.warn(
        "Better Auth: webhook handling is not yet implemented. " +
          "Better Auth uses an events API instead of traditional webhooks. " +
          "Configure event listeners in the betterAuth() options.",
      );
    },
  };
}

// ─── Prisma Client Resolution ───

/**
 * Resolve a PrismaClient instance for the Better Auth adapter.
 *
 * Priority:
 * 1. `config.options.prisma` — explicitly passed PrismaClient
 * 2. Dynamic import from `@nebutra/db` — monorepo default
 */
async function getPrismaClient(config: AuthConfig): Promise<unknown> {
  const options = config.options as Record<string, unknown> | undefined;
  if (options?.prisma) {
    return options.prisma;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dbModule = await import("@nebutra/db");
    return (
      (dbModule as Record<string, unknown>).prisma ?? (dbModule as Record<string, unknown>).default
    );
  } catch {
    throw new Error(
      "Better Auth requires a PrismaClient instance. " +
        "Either pass it via config.options.prisma or ensure @nebutra/db is available.",
    );
  }
}
