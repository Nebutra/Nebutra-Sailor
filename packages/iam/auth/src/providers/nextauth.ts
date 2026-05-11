/**
 * NextAuth (Auth.js v5) provider implementation.
 *
 * Wraps `next-auth` v5 to implement the unified AuthProvider interface.
 * Uses the JWT session strategy by default — no database adapter required.
 * Application code that wants persistent users (Prisma) should pass an
 * adapter via `config.options.adapter`.
 *
 * Built-in providers (auto-enabled when env vars are present):
 *  - Credentials  (always on — email/password lookup is delegated to
 *                  `config.options.authorize` callback)
 *  - Google OAuth (when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET set)
 *  - GitHub OAuth (when GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET set)
 *
 * Environment variables:
 *  - AUTH_SECRET or NEXTAUTH_SECRET (required) — JWT signing key
 *  - NEXTAUTH_URL or AUTH_URL (optional in v5 when behind a known host)
 *  - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (optional)
 *  - GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET (optional)
 *
 * Notes vs Better Auth:
 *  - NextAuth does not expose CRUD APIs for users/orgs by design — its surface
 *    is "sign-in, session, callbacks". `createUser` / `getUser` therefore go
 *    through whichever adapter is configured (Prisma adapter recommended for
 *    production). When no adapter is configured these methods throw with
 *    explicit guidance rather than returning null silently.
 *  - Multi-tenant organization concepts are not first-class in NextAuth.
 *    The implementation below stubs them with explanatory errors so callers
 *    learn early that org features need to be wired through the application
 *    layer (typically via Prisma + a custom session callback).
 */

import { logger } from "@nebutra/logger";
import type {
  AuthCapabilities,
  AuthConfig,
  AuthProvider,
  CreateOrgInput,
  CreateUserInput,
  Organization,
  Session,
  SignInMethod,
  SignInResult,
  User,
} from "../types";

/**
 * NextAuth/Auth.js capabilities, all `false` per ADR D2.
 *
 * NextAuth deliberately keeps its scope narrow — passkeys, multi-tenant
 * organizations, TOTP 2FA, and magic-link are not first-class features of
 * the framework. Operators bolt them on at the application layer (custom
 * session callbacks + Prisma). Reporting them as `true` here would be a
 * speculative implementation that the consumer-facing API can't actually
 * satisfy, so we stay honest.
 */
const NEXTAUTH_CAPABILITIES: AuthCapabilities = Object.freeze({
  passkeys: false,
  organizations: false,
  twoFactor: false,
  magicLink: false,
  impersonation: false,
});

// ─── Types from next-auth (declared loosely to avoid hard dep at type-check time) ───

interface NextAuthRuntime {
  handlers: {
    GET: (req: Request) => Promise<Response>;
    POST: (req: Request) => Promise<Response>;
  };
  auth: ((req?: Request) => Promise<unknown>) & ((...args: unknown[]) => unknown);
  signIn: (...args: unknown[]) => Promise<unknown>;
  signOut: (...args: unknown[]) => Promise<unknown>;
}

interface NextAuthSessionShape {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
  expires?: string;
  organizationId?: string;
  role?: string;
}

// ─── Helpers ───

/**
 * Map a raw NextAuth session payload onto our canonical Session shape.
 *
 * Exported so tests can pin behavior without standing up a full NextAuth
 * runtime. Returns null for any payload that is missing a `user.id`, since
 * Auth.js's default session callback may surface a user object without an id
 * before the consumer wires a custom session callback that populates it.
 */
export function mapSession(raw: NextAuthSessionShape | null | undefined): Session | null {
  if (!raw || !raw.user) return null;
  const userId = raw.user.id ?? "";
  if (!userId) return null;
  const email = raw.user.email ?? undefined;
  return {
    userId,
    expiresAt: raw.expires ? new Date(raw.expires) : new Date(Date.now() + 3_600_000),
    ...(email !== undefined ? { email } : {}),
    ...(raw.organizationId !== undefined ? { organizationId: raw.organizationId } : {}),
    ...(raw.role !== undefined ? { role: raw.role } : {}),
  };
}

// ─── Provider ───

export function createNextAuthProvider(config: AuthConfig): AuthProvider {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET (or legacy NEXTAUTH_SECRET) environment variable is required for the NextAuth provider. " +
        "Generate one with: openssl rand -base64 32",
    );
  }

  // Lazy NextAuth instance — `next-auth` is an optional peer dependency, so
  // import it only when a consumer actively selects this provider.
  let runtime: NextAuthRuntime | null = null;

  async function getRuntime(): Promise<NextAuthRuntime> {
    if (runtime) return runtime;

    const [{ default: NextAuth }, googleMod, githubMod, credentialsMod] = await Promise.all([
      // `next-auth` is a peer dep — when not installed, this import throws at
      // runtime in the worker that selected this provider. The typecheck path
      // resolves it via the workspace install.
      import("next-auth"),
      tryImport("next-auth/providers/google"),
      tryImport("next-auth/providers/github"),
      tryImport("next-auth/providers/credentials"),
    ]);

    const providers: unknown[] = [];

    if (credentialsMod) {
      const Credentials =
        (credentialsMod.default as unknown as (opts: unknown) => unknown) ??
        (credentialsMod.Credentials as unknown as (opts: unknown) => unknown);
      const authorize =
        (config.options as Record<string, unknown> | undefined)?.authorize ??
        (async () => {
          logger.warn(
            "NextAuth: no `authorize` callback supplied via config.options.authorize. " +
              "Credentials sign-in will always fail until you wire one up.",
          );
          return null;
        });
      providers.push(
        Credentials({
          name: "Credentials",
          credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
          },
          authorize,
        }),
      );
    }

    if (googleMod && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      const Google =
        (googleMod.default as unknown as (opts: unknown) => unknown) ??
        (googleMod.Google as unknown as (opts: unknown) => unknown);
      providers.push(
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      );
    }

    if (githubMod && process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      const GitHub =
        (githubMod.default as unknown as (opts: unknown) => unknown) ??
        (githubMod.GitHub as unknown as (opts: unknown) => unknown);
      providers.push(
        GitHub({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        }),
      );
    }

    if (providers.length === 0) {
      logger.warn(
        "NextAuth: no providers were enabled (no credentials module, no OAuth env vars). " +
          "Sign-in routes will mount but reject every attempt.",
      );
    }

    const userOptions = (config.options as Record<string, unknown> | undefined) ?? {};
    const adapter = userOptions.adapter as unknown;

    const nextAuthConfig: Record<string, unknown> = {
      secret,
      session: { strategy: adapter ? "database" : "jwt" },
      providers,
      ...userOptions,
    };

    runtime = (NextAuth as unknown as (cfg: Record<string, unknown>) => NextAuthRuntime)(
      nextAuthConfig,
    );
    return runtime;
  }

  async function ensureAdapterOrThrow(method: string): Promise<never> {
    throw new Error(
      `NextAuth: ${method} requires a database adapter (e.g. @auth/prisma-adapter). ` +
        "Pass it via createAuth({ provider: 'nextauth', options: { adapter } }). " +
        "See: https://authjs.dev/getting-started/adapters",
    );
  }

  return {
    provider: "nextauth",

    capabilities: NEXTAUTH_CAPABILITIES,

    async signIn(method: SignInMethod): Promise<SignInResult> {
      try {
        const r = await getRuntime();
        switch (method.type) {
          case "email-password": {
            // Auth.js v5 expects credential payload as the second arg.
            // We pass `redirect: false` so the call resolves with a result
            // object instead of throwing a redirect.
            const raw = (await r.signIn("credentials", {
              email: method.email,
              password: method.password,
              redirect: false,
            })) as { ok?: boolean; url?: string; error?: string } | undefined;

            if (!raw || raw.error) {
              return {
                ok: false,
                error: {
                  code: "invalid-credentials",
                  message: raw?.error ?? "Credentials sign-in failed.",
                },
              };
            }
            return {
              ok: true,
              ...(raw.url ? { redirectTo: raw.url } : {}),
            };
          }
          case "oauth": {
            const raw = (await r.signIn(method.provider, {
              redirect: false,
              ...(method.redirectUrl ? { redirectTo: method.redirectUrl } : {}),
            })) as { url?: string; error?: string } | undefined;
            if (raw?.error) {
              return {
                ok: false,
                error: { code: "unknown", message: raw.error },
              };
            }
            return {
              ok: true,
              ...(raw?.url ? { redirectTo: raw.url } : {}),
            };
          }
          case "phone": {
            return {
              ok: false,
              error: {
                code: "unsupported",
                message:
                  "NextAuth: phone sign-in is not a first-class Auth.js provider. " +
                  "Wire it via a custom credentials provider if needed.",
              },
            };
          }
          default: {
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
        logger.error("NextAuth signIn failed", { type: method.type, error });
        const message = error instanceof Error ? error.message : "Sign-in failed";
        return {
          ok: false,
          error: {
            code: /credential|password/i.test(message) ? "invalid-credentials" : "unknown",
            message,
          },
        };
      }
    },

    async signOut(_request: Request): Promise<void> {
      try {
        const r = await getRuntime();
        // Auth.js v5 signOut accepts `{ redirect: false }` to suppress
        // the framework's automatic redirect response. We're calling from
        // server code that handles its own response.
        await r.signOut({ redirect: false });
      } catch (error) {
        logger.error("NextAuth signOut failed", { error });
      }
    },

    async getSession(request) {
      try {
        const r = await getRuntime();
        const raw = (await (request ? r.auth(request) : r.auth())) as NextAuthSessionShape | null;
        return mapSession(raw);
      } catch (error) {
        logger.error("NextAuth getSession failed", { error });
        return null;
      }
    },

    async getUser(_userId: string) {
      const adapter = (config.options as Record<string, unknown> | undefined)?.adapter;
      if (!adapter) {
        logger.warn(
          "NextAuth: getUser requires an adapter. Returning null. " +
            "See https://authjs.dev/getting-started/adapters",
        );
        return null;
      }
      try {
        const a = adapter as { getUser?: (id: string) => Promise<Record<string, unknown> | null> };
        if (typeof a.getUser !== "function") return null;
        const raw = await a.getUser(_userId);
        if (!raw) return null;
        return {
          id: String(raw.id),
          email: (raw.email as string) ?? undefined,
          name: (raw.name as string) ?? undefined,
          imageUrl: (raw.image as string) ?? undefined,
          createdAt: raw.createdAt ? new Date(raw.createdAt as string | number) : new Date(),
        } satisfies User;
      } catch (error) {
        logger.error("NextAuth getUser failed", { error });
        return null;
      }
    },

    async createUser(_data: CreateUserInput) {
      return ensureAdapterOrThrow("createUser");
    },

    async getOrganization(_orgId) {
      logger.warn(
        "NextAuth: organizations are not first-class in Auth.js. " +
          "Implement a session callback that hydrates orgs from your DB, then read from session.",
      );
      return null;
    },

    async getUserOrganizations(_userId) {
      logger.warn(
        "NextAuth: organizations are not first-class in Auth.js. " +
          "Use Prisma directly to list memberships, then attach via session callback.",
      );
      return [];
    },

    async createOrganization(_data: CreateOrgInput): Promise<Organization> {
      return ensureAdapterOrThrow("createOrganization");
    },

    middleware() {
      return async (req: Request): Promise<Response | undefined> => {
        const r = await getRuntime();
        if (req.method === "GET") return r.handlers.GET(req);
        if (req.method === "POST") return r.handlers.POST(req);
        return undefined;
      };
    },

    async handleWebhook(_request) {
      logger.warn(
        "NextAuth: webhooks are not part of the framework. " +
          "If you proxy events from an OAuth provider (Google/GitHub), handle them in your own route.",
      );
    },
  };
}

// ─── Optional-import helper ───

async function tryImport(specifier: string): Promise<Record<string, unknown> | null> {
  try {
    return (await import(specifier)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
