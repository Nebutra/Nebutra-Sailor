/**
 * Clerk auth provider — documentation bridge.
 *
 * Clerk is used via `@clerk/nextjs` which has its own React integration,
 * server-side helpers, and middleware. This provider implements the unified
 * AuthProvider interface as a **guidance layer** — each method documents the
 * correct Clerk-native API to call.
 *
 * Unlike self-hosted providers (Better Auth), Clerk manages user
 * data in its own infrastructure. The methods below return `null` / `[]` by
 * default and log guidance about which Clerk API to use instead.
 *
 * Clerk dependencies (`@clerk/nextjs`, `@clerk/backend`) should remain in
 * `apps/web` and `apps/api-gateway` — NOT added to `@nebutra/auth`.
 *
 * @see https://clerk.com/docs
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

/**
 * Create a Clerk auth provider instance.
 *
 * @example
 * ```ts
 * // In apps/web — use Clerk's native APIs directly:
 * import { auth, currentUser } from "@clerk/nextjs/server";
 * import { clerkMiddleware } from "@clerk/nextjs/server";
 *
 * // Server component
 * const { userId, orgId } = await auth();
 * const user = await currentUser();
 * ```
 */
export function createClerkAuth(_config: AuthConfig): AuthProvider {
  return {
    provider: "clerk",

    /**
     * Resolve the current session from an incoming request.
     *
     * **Clerk-native approach:** Use `auth()` from `@clerk/nextjs/server`
     * in Next.js server components / route handlers:
     * ```ts
     * import { auth } from "@clerk/nextjs/server";
     * const { userId, orgId, orgRole, sessionClaims } = await auth();
     * ```
     *
     * This method returns `null` because Clerk sessions are resolved by
     * Clerk's own middleware and server helpers, not through this abstraction.
     */
    async getSession(_request?: Request): Promise<Session | null> {
      logger.warn(
        "Clerk auth: use auth() from @clerk/nextjs/server to resolve sessions. " +
          "This provider method is a documentation bridge — Clerk handles sessions natively.",
      );
      return null;
    },

    /**
     * Fetch a user by ID.
     *
     * **Clerk-native approach:** Use `clerkClient()` from `@clerk/nextjs/server`:
     * ```ts
     * import { clerkClient } from "@clerk/nextjs/server";
     * const client = await clerkClient();
     * const user = await client.users.getUser(userId);
     * ```
     */
    async getUser(_userId: string): Promise<User | null> {
      logger.warn(
        "Clerk auth: use clerkClient().users.getUser(userId) to fetch users. " +
          "See: https://clerk.com/docs/references/backend/user/get-user",
      );
      return null;
    },

    /**
     * Create a new user.
     *
     * **Clerk-native approach:** Users are typically created through Clerk's
     * sign-up flow (UI components or API). For programmatic creation:
     * ```ts
     * import { clerkClient } from "@clerk/nextjs/server";
     * const client = await clerkClient();
     * const user = await client.users.createUser({
     *   emailAddress: ["user@example.com"],
     *   password: "secure-password",
     * });
     * ```
     */
    async createUser(_data: CreateUserInput): Promise<User> {
      throw new Error(
        "Clerk auth: user creation is managed by Clerk. " +
          "Use Clerk's sign-up components (<SignUp />) or " +
          "clerkClient().users.createUser() for programmatic creation. " +
          "See: https://clerk.com/docs/references/backend/user/create-user",
      );
    },

    /**
     * Fetch an organization by ID.
     *
     * **Clerk-native approach:**
     * ```ts
     * import { clerkClient } from "@clerk/nextjs/server";
     * const client = await clerkClient();
     * const org = await client.organizations.getOrganization({ organizationId });
     * ```
     */
    async getOrganization(_orgId: string): Promise<Organization | null> {
      logger.warn(
        "Clerk auth: use clerkClient().organizations.getOrganization() to fetch organizations. " +
          "See: https://clerk.com/docs/references/backend/organization/get-organization",
      );
      return null;
    },

    /**
     * List all organizations a user belongs to.
     *
     * **Clerk-native approach:**
     * ```ts
     * import { clerkClient } from "@clerk/nextjs/server";
     * const client = await clerkClient();
     * const memberships = await client.users.getOrganizationMembershipList({ userId });
     * ```
     *
     * Or in React components:
     * ```tsx
     * import { useOrganizationList } from "@clerk/nextjs";
     * const { organizationList } = useOrganizationList();
     * ```
     */
    async getUserOrganizations(_userId: string): Promise<Organization[]> {
      logger.warn(
        "Clerk auth: use clerkClient().users.getOrganizationMembershipList() to list user orgs. " +
          "See: https://clerk.com/docs/references/backend/user/get-organization-membership-list",
      );
      return [];
    },

    /**
     * Create a new organization.
     *
     * **Clerk-native approach:**
     * ```ts
     * import { clerkClient } from "@clerk/nextjs/server";
     * const client = await clerkClient();
     * const org = await client.organizations.createOrganization({
     *   name: "My Org",
     *   slug: "my-org",
     *   createdBy: userId,
     * });
     * ```
     */
    async createOrganization(_data: CreateOrgInput): Promise<Organization> {
      throw new Error(
        "Clerk auth: organization creation is managed by Clerk. " +
          "Use <CreateOrganization /> component or " +
          "clerkClient().organizations.createOrganization() for programmatic creation. " +
          "See: https://clerk.com/docs/references/backend/organization/create-organization",
      );
    },

    /**
     * Return a request handler for auth middleware.
     *
     * **Clerk-native approach:** Use `clerkMiddleware()` directly in your
     * Next.js middleware file:
     * ```ts
     * // middleware.ts (or proxy.ts)
     * import { clerkMiddleware } from "@clerk/nextjs/server";
     * export default clerkMiddleware();
     * ```
     *
     * This abstraction intentionally throws because Clerk middleware must be
     * configured at the framework level, not through this provider layer.
     */
    middleware(): (req: Request) => Promise<Response | undefined> {
      throw new Error(
        "Clerk auth: use clerkMiddleware() from @clerk/nextjs/server directly. " +
          "Clerk middleware must be configured at the framework level (middleware.ts / proxy.ts). " +
          "See: https://clerk.com/docs/references/nextjs/clerk-middleware",
      );
    },

    /**
     * Handle an incoming webhook from Clerk.
     *
     * **Clerk-native approach:** Clerk uses Svix for webhook delivery.
     * Set up a webhook endpoint and verify signatures:
     * ```ts
     * import { Webhook } from "svix";
     *
     * const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
     * const payload = wh.verify(body, headers);
     * ```
     *
     * @see https://clerk.com/docs/webhooks/overview
     */
    async handleWebhook(_request: Request): Promise<void> {
      logger.warn(
        "Clerk auth: webhook handling should use Clerk's Svix-based webhook verification. " +
          "See: https://clerk.com/docs/webhooks/overview",
      );
    },
  };
}
