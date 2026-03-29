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
import type {
  AuthConfig,
  AuthProvider,
  CreateOrgInput,
  CreateUserInput,
  Organization,
  Session,
  User,
} from "../types";

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

    // Dynamically import the organization plugin — it may not be available
    let orgPlugin: unknown | undefined;
    try {
      const orgModule = await import("better-auth/plugins/organization");
      orgPlugin = orgModule.organization();
    } catch {
      logger.warn(
        "Better Auth: organization plugin not available — multi-tenant features will be stubbed.",
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugins: any[] = orgPlugin ? [orgPlugin] : [];

    const prismaClient = await getPrismaClient(config);

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

  return {
    provider: "better-auth",

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
