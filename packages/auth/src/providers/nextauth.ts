/**
 * NextAuth (Auth.js v5) provider stub.
 *
 * This provider is not yet fully implemented. It defines the intended API
 * shape and documents what each method will do once `next-auth@5` and
 * `@auth/prisma-adapter` are installed.
 *
 * To enable this provider:
 * 1. Install dependencies:
 *    ```bash
 *    pnpm --filter @nebutra/auth add next-auth@5 @auth/prisma-adapter
 *    ```
 * 2. Set environment variables:
 *    - AUTH_SECRET (required — generate with `openssl rand -base64 32`)
 *    - AUTH_URL (optional — base URL, auto-detected in Vercel)
 *    - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (optional)
 *    - GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET (optional)
 * 3. Run `prisma migrate dev` to ensure auth tables exist.
 *
 * Architecture notes:
 * - Uses the same AuthUser/AuthSession/AuthAccount/AuthVerification tables
 *   as the Better Auth provider (shared Prisma schema).
 * - Auth.js v5 uses the `@auth/prisma-adapter` to bridge to Prisma.
 * - Session strategy: JWT by default, with optional database sessions.
 * - Organizations: implemented manually (Auth.js has no built-in org support).
 *
 * @see https://authjs.dev/getting-started
 * @see https://authjs.dev/getting-started/adapters/prisma
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

const NOT_IMPLEMENTED_MSG =
  "NextAuth provider is not yet implemented. " +
  "Install next-auth@5 and @auth/prisma-adapter to enable Auth.js integration. " +
  "See docs/plans/2026-03-28-auth-multi-provider-design.md Phase 3.";

/**
 * Create a NextAuth (Auth.js v5) provider instance.
 *
 * **Current status:** Stub — all methods throw or return placeholder values
 * with descriptive error messages guiding the implementer.
 *
 * **Intended implementation:**
 * ```ts
 * import NextAuth from "next-auth";
 * import { PrismaAdapter } from "@auth/prisma-adapter";
 * import Google from "next-auth/providers/google";
 * import GitHub from "next-auth/providers/github";
 * import Credentials from "next-auth/providers/credentials";
 *
 * const { handlers, auth, signIn, signOut } = NextAuth({
 *   adapter: PrismaAdapter(prisma),
 *   providers: [Google({...}), GitHub({...}), Credentials({...})],
 *   callbacks: {
 *     session: ({ session, user }) => ({
 *       ...session,
 *       user: { ...session.user, id: user.id },
 *     }),
 *   },
 * });
 * ```
 */
export function createNextAuthProvider(_config: AuthConfig): AuthProvider {
  logger.warn(
    "NextAuth provider is in stub mode. All methods will throw or return empty results. " +
      "Install next-auth@5 and @auth/prisma-adapter to enable full functionality.",
  );

  return {
    provider: "nextauth",

    /**
     * Resolve the current session from an incoming request.
     *
     * **Intended implementation:** Call Auth.js `auth()` helper:
     * ```ts
     * const session = await auth();
     * return session ? { userId: session.user.id, ... } : null;
     * ```
     *
     * Auth.js reads the session token from cookies and verifies it (JWT or
     * database strategy). The `auth()` helper is created by `NextAuth()`.
     */
    async getSession(_request?: Request): Promise<Session | null> {
      throw new Error(NOT_IMPLEMENTED_MSG);
    },

    /**
     * Fetch a user by ID.
     *
     * **Intended implementation:** Query the AuthUser table via Prisma:
     * ```ts
     * const user = await prisma.authUser.findUnique({ where: { id: userId } });
     * return user ? mapUser(user) : null;
     * ```
     */
    async getUser(_userId: string): Promise<User | null> {
      throw new Error(NOT_IMPLEMENTED_MSG);
    },

    /**
     * Create a new user.
     *
     * **Intended implementation:** For email/password, hash the password and
     * insert into AuthUser + AuthAccount tables:
     * ```ts
     * const hash = await bcrypt.hash(data.password, 12);
     * const user = await prisma.authUser.create({
     *   data: { email: data.email, name: data.name, passwordHash: hash },
     * });
     * ```
     *
     * For OAuth users, Auth.js handles user creation automatically via
     * callbacks during the sign-in flow.
     */
    async createUser(_data: CreateUserInput): Promise<User> {
      throw new Error(NOT_IMPLEMENTED_MSG);
    },

    /**
     * Fetch an organization by ID.
     *
     * **Intended implementation:** Auth.js has no built-in organization
     * support. Organizations must be managed manually:
     * ```ts
     * const org = await prisma.organization.findUnique({ where: { id: orgId } });
     * return org ? mapOrganization(org) : null;
     * ```
     *
     * Consider using the existing Organization model in the Prisma schema.
     */
    async getOrganization(_orgId: string): Promise<Organization | null> {
      throw new Error(NOT_IMPLEMENTED_MSG);
    },

    /**
     * List all organizations a user belongs to.
     *
     * **Intended implementation:** Query the Membership table:
     * ```ts
     * const memberships = await prisma.membership.findMany({
     *   where: { userId },
     *   include: { organization: true },
     * });
     * return memberships.map(m => mapOrganization(m.organization));
     * ```
     */
    async getUserOrganizations(_userId: string): Promise<Organization[]> {
      throw new Error(NOT_IMPLEMENTED_MSG);
    },

    /**
     * Create a new organization.
     *
     * **Intended implementation:** Insert into Organization + Membership:
     * ```ts
     * const org = await prisma.organization.create({
     *   data: {
     *     name: data.name,
     *     slug: data.slug,
     *     plan: data.plan ?? "FREE",
     *     memberships: { create: { userId: data.createdByUserId, role: "OWNER" } },
     *   },
     * });
     * ```
     */
    async createOrganization(_data: CreateOrgInput): Promise<Organization> {
      throw new Error(NOT_IMPLEMENTED_MSG);
    },

    /**
     * Return a request handler for auth middleware.
     *
     * **Intended implementation:** Return Auth.js route handlers:
     * ```ts
     * const { handlers } = NextAuth({ ... });
     * // In middleware.ts:
     * export { handlers.GET, handlers.POST } from "./auth";
     * // Or as a catch-all handler:
     * return async (req) => handlers(req);
     * ```
     *
     * Auth.js uses route handlers at `/api/auth/*` for sign-in, callbacks, etc.
     */
    middleware(): (req: Request) => Promise<Response | undefined> {
      throw new Error(NOT_IMPLEMENTED_MSG);
    },

    /**
     * Handle an incoming webhook.
     *
     * **Intended implementation:** Auth.js uses events/callbacks instead of
     * traditional webhooks. Configure them in the NextAuth options:
     * ```ts
     * NextAuth({
     *   events: {
     *     createUser: async (message) => { ... },
     *     signIn: async (message) => { ... },
     *     signOut: async (message) => { ... },
     *   },
     * });
     * ```
     */
    async handleWebhook(_request: Request): Promise<void> {
      throw new Error(NOT_IMPLEMENTED_MSG);
    },
  };
}
