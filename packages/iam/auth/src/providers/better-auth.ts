/**
 * Better Auth provider implementation.
 *
 * Wraps the `better-auth` library to implement the unified AuthProvider
 * interface. Requires a PostgreSQL database (via Prisma) and optionally
 * supports OAuth social providers and the organization plugin.
 *
 * This file is the registration / orchestration layer. The per-capability
 * builders, mappers, plugin loaders, capability probe, and Prisma resolution
 * live in the `./better-auth/` sub-modules and are re-exported here so the
 * public surface (and the `providers/better-auth` import path) stays stable.
 *
 * Environment variables:
 * - BETTER_AUTH_SECRET (required)
 * - BETTER_AUTH_URL (optional, base URL for auth endpoints)
 * - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (optional, enables Google OAuth)
 * - GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET (optional, enables GitHub OAuth)
 * - APPLE_CLIENT_ID / APPLE_CLIENT_SECRET (optional, enables Sign in with Apple — App Store compliance for SaaS apps that ship Google/Facebook login)
 * - MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET (optional, enables Microsoft OAuth — required for enterprise / EDU customers)
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
  SignInMethod,
  SignInResult,
  TwoFactorCapability,
} from "../types";
import { ALL_FALSE_CAPABILITIES, probeBetterAuthCapabilities } from "./better-auth/capabilities";
import { buildMagicLinkCapability } from "./better-auth/magic-link";
import { mapSession, mapUser } from "./better-auth/mappers";
import { buildOrganizationsCapability } from "./better-auth/organization";
import { buildPasskeysCapability } from "./better-auth/passkey";
import { loadBetterAuthOneTapPlugin, loadOptionalPlugin } from "./better-auth/plugin-loaders";
import { resolveBetterAuthPrismaClient } from "./better-auth/prisma";
import { buildTwoFactorCapability } from "./better-auth/totp";
import type { BetterAuthApi } from "./better-auth/types";

// ─── Re-exports: keep the historical `providers/better-auth` public surface ──
//
// Consumers (the @nebutra/auth factory in server.ts, the contract tests, and
// the construction-time tests) import these names from this module path. They
// now live in sub-modules; re-export verbatim so the import path is unchanged.
export {
  BETTER_AUTH_CAPABILITY_PROBES,
  probeBetterAuthCapabilities,
} from "./better-auth/capabilities";
export { buildMagicLinkCapability } from "./better-auth/magic-link";
export { buildOrganizationsCapability } from "./better-auth/organization";
export { buildPasskeysCapability } from "./better-auth/passkey";
export { loadBetterAuthOneTapPlugin } from "./better-auth/plugin-loaders";
export { resolveBetterAuthPrismaClient } from "./better-auth/prisma";
export { buildTwoFactorCapability } from "./better-auth/totp";

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

  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
    socialProviders.apple = {
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    };
  }

  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    socialProviders.microsoft = {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    };
  }

  if (Object.keys(socialProviders).length === 0) {
    logger.info(
      "Better Auth: no OAuth providers configured — only email/password login is available. " +
        "Set GOOGLE_CLIENT_ID/SECRET, GITHUB_CLIENT_ID/SECRET, APPLE_CLIENT_ID/SECRET, or MICROSOFT_CLIENT_ID/SECRET to enable social login.",
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

    // Passkey — uses our own plugin backed by @simplewebauthn/server because
    // better-auth 1.5.6 does NOT ship `./plugins/passkey` in its `exports`
    // map. Credentials persist into the existing `auth.passkey` Prisma table
    // already present in the schema.
    //
    // Skip if BETTER_AUTH_URL is not set — the rpID needs a real domain.
    let passkeyPlugin: BetterAuthPlugin | undefined;
    try {
      const { passkey } = await import("../plugins/passkey-plugin");
      const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
      const parsed = new URL(baseUrl);
      passkeyPlugin = passkey({
        rpName: process.env.PASSKEY_RP_NAME ?? "Nebutra",
        rpID: process.env.PASSKEY_RP_ID ?? parsed.hostname,
        origin: process.env.PASSKEY_ORIGIN ?? parsed.origin,
      });
    } catch (error) {
      logger.warn(
        "Better Auth: failed to load Nebutra passkey plugin — WebAuthn endpoints will be unavailable.",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }

    // Captcha — uses Better Auth's built-in `captcha` plugin with Cloudflare
    // Turnstile when `TURNSTILE_SECRET_KEY` is set. The plugin intercepts
    // sensitive endpoints (sign-in, sign-up, password reset) and rejects
    // requests without a valid token. Header name: `x-captcha-response`.
    let captchaPlugin: BetterAuthPlugin | undefined;
    if (process.env.TURNSTILE_SECRET_KEY) {
      try {
        const captchaModule = (await loadOptionalPlugin("captcha")) as {
          captcha: (opts: {
            provider: "cloudflare-turnstile";
            secretKey: string;
            endpoints?: string[];
          }) => BetterAuthPlugin;
        };
        captchaPlugin = captchaModule.captcha({
          provider: "cloudflare-turnstile",
          secretKey: process.env.TURNSTILE_SECRET_KEY,
        });
      } catch {
        logger.warn("Better Auth: captcha plugin not available — bot verification will not run.");
      }
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

    const oneTapPlugin = await loadBetterAuthOneTapPlugin();

    const plugins: BetterAuthPlugin[] = [];
    if (orgPlugin) plugins.push(orgPlugin);
    if (twoFactorPlugin) plugins.push(twoFactorPlugin);
    if (passkeyPlugin) plugins.push(passkeyPlugin);
    if (magicLinkPlugin) plugins.push(magicLinkPlugin);
    if (captchaPlugin) plugins.push(captchaPlugin);
    if (oneTapPlugin) plugins.push(oneTapPlugin);

    const prismaClient = await resolveBetterAuthPrismaClient(config);

    // Audit hooks — bridge Better Auth's `databaseHooks` into @nebutra/audit so
    // that `auth.password.changed` / `auth.2fa.enabled` / `auth.2fa.disabled`
    // are emitted even though they aren't path-distinguishable at the
    // /api/auth/[...all] route. See packages/iam/auth/src/audit-events.ts.
    //
    // Invitation hooks (ADR-12 Phase 2) — populate the additive Phase 1 fields
    // (`token`, `expiresAt`) on `auth.invitation` rows BA's `organization`
    // plugin doesn't supply. See packages/iam/auth/src/invitation-hooks.ts.
    const { buildAuditDatabaseHooks } = await import("../audit-events");
    const { buildInvitationDatabaseHooks, mergeDatabaseHooks } = await import(
      "../invitation-hooks"
    );
    const databaseHooks = mergeDatabaseHooks(
      buildAuditDatabaseHooks(),
      buildInvitationDatabaseHooks(),
    ) as Record<string, unknown>;

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
