/**
 * @nebutra/auth — Development-only fixture provider.
 *
 * Returns a synthetic authenticated session so developers can preview the
 * authenticated app surfaces without hitting a real auth backend. NEVER
 * ships to production.
 *
 * Activation: set `AUTH_PROVIDER=dev` AND `NEXT_PUBLIC_AUTH_PROVIDER=dev`
 * in `.env.local`. The provider is otherwise inert.
 *
 * Production safety: this module throws at import time if NODE_ENV is
 * "production" — there is no opt-in path that allows the dev provider to
 * be loaded in a production build.
 */

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

// ─── Production hard-block ────────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "[@nebutra/auth] The `dev` provider MUST NOT be loaded in production. " +
      "Unset AUTH_PROVIDER / NEXT_PUBLIC_AUTH_PROVIDER or set it to a real provider " +
      "(clerk | better-auth | nextauth | supabase).",
  );
}

// ─── Fixture data ─────────────────────────────────────────────────────────────

const FIXTURE_EPOCH = new Date("2025-01-01T00:00:00.000Z");
const DEV_USER_EMAIL = "dev@nebutra.local";

export const DEV_FIXTURE_USER: User = {
  id: "dev-user-001",
  email: DEV_USER_EMAIL,
  name: "Dev User",
  createdAt: FIXTURE_EPOCH,
};

export const DEV_FIXTURE_ORG: Organization = {
  id: "dev-org-001",
  name: "Dev Workspace",
  slug: "dev",
  plan: "pro",
  createdAt: FIXTURE_EPOCH,
};

const DEV_CAPABILITIES: AuthCapabilities = {
  passkeys: false,
  organizations: true,
  twoFactor: false,
  magicLink: false,
  impersonation: false,
};

function buildDevSession(): Session {
  return {
    userId: DEV_FIXTURE_USER.id,
    organizationId: DEV_FIXTURE_ORG.id,
    role: "owner",
    email: DEV_USER_EMAIL,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function createDevAuthProvider(_config: AuthConfig): AuthProvider {
  return {
    provider: "dev",
    capabilities: DEV_CAPABILITIES,

    async getSession(): Promise<Session | null> {
      return buildDevSession();
    },

    async getUser(userId: string): Promise<User | null> {
      return userId === DEV_FIXTURE_USER.id ? DEV_FIXTURE_USER : null;
    },

    async createUser(_data: CreateUserInput): Promise<User> {
      throw new Error("[@nebutra/auth/dev] createUser is not supported in dev mode");
    },

    async getOrganization(orgId: string): Promise<Organization | null> {
      return orgId === DEV_FIXTURE_ORG.id ? DEV_FIXTURE_ORG : null;
    },

    async getUserOrganizations(): Promise<Organization[]> {
      return [DEV_FIXTURE_ORG];
    },

    async createOrganization(_data: CreateOrgInput): Promise<Organization> {
      throw new Error("[@nebutra/auth/dev] createOrganization is not supported in dev mode");
    },

    async signIn(_method: SignInMethod): Promise<SignInResult> {
      return {
        ok: true,
        userId: DEV_FIXTURE_USER.id,
        organizationId: DEV_FIXTURE_ORG.id,
      };
    },

    async signOut(): Promise<void> {
      // no-op
    },

    middleware() {
      return async () => undefined;
    },

    async handleWebhook(): Promise<void> {
      // no-op
    },
  };
}
