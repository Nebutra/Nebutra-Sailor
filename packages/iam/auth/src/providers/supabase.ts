/**
 * Supabase Auth provider adapter.
 *
 * Wraps `@supabase/supabase-js` to implement the unified AuthProvider interface.
 * Server-side operations use the service-role client; sign-in flows use the
 * anon client so JWTs are scoped to the calling user, not the service role.
 *
 * Environment variables:
 * - SUPABASE_URL              (required)
 * - SUPABASE_ANON_KEY         (required — anon/public key for sign-in flows)
 * - SUPABASE_SERVICE_ROLE_KEY (required — admin key for server-side user ops)
 * - SUPABASE_WEBHOOK_SECRET   (optional — enables webhook signature verification)
 *
 * Organizations: Supabase has no built-in teams/orgs concept.
 * Use @nebutra/tenant + Postgres RLS for multi-tenancy instead.
 */

import { createHmac } from "node:crypto";
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

type SupabaseClient = Awaited<ReturnType<typeof lazyAdminClient>>;

const CAPABILITIES: Readonly<AuthCapabilities> = Object.freeze({
  passkeys: false,
  organizations: false,
  twoFactor: false,
  magicLink: false,
  impersonation: false,
});

// ─── Mappers ───

function mapUser(
  raw: {
    id: string;
    email?: string | null;
    phone?: string | null;
    user_metadata?: Record<string, unknown>;
    created_at?: string;
  } | null,
): User | null {
  if (!raw) return null;
  const fullName = raw.user_metadata?.full_name as string | undefined;
  const avatarUrl = raw.user_metadata?.avatar_url as string | undefined;
  return {
    id: raw.id,
    ...(raw.email ? { email: raw.email } : {}),
    ...(raw.phone ? { phone: raw.phone } : {}),
    ...(fullName ? { name: fullName } : {}),
    ...(avatarUrl ? { imageUrl: avatarUrl } : {}),
    createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
  };
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// ─── Lazy admin client factory ───

async function lazyAdminClient(url: string, serviceKey: string) {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Provider factory ───

export function createSupabaseAuthProvider(_config: AuthConfig): AuthProvider {
  // Accept both server-only and Next.js public-prefixed env var names.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("SUPABASE_URL is required for the Supabase auth provider.");
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required for the Supabase auth provider.");
  if (!serviceKey)
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for the Supabase auth provider.");

  let adminClient: SupabaseClient | null = null;
  async function getAdmin(): Promise<SupabaseClient> {
    if (!adminClient) adminClient = await lazyAdminClient(url!, serviceKey!);
    return adminClient;
  }

  return {
    provider: "supabase",

    get capabilities(): Readonly<AuthCapabilities> {
      return CAPABILITIES;
    },

    organizations: undefined,
    passkeys: undefined,
    twoFactor: undefined,
    magicLink: undefined,

    async getSession(request?: Request): Promise<Session | null> {
      if (!request) return null;
      const token = extractBearerToken(request);
      if (!token) return null;
      try {
        const admin = await getAdmin();
        const { data, error } = await admin.auth.getUser(token);
        if (error || !data.user) return null;
        return {
          userId: data.user.id,
          ...(data.user.email ? { email: data.user.email } : {}),
          expiresAt: new Date(Date.now() + 3_600_000),
        };
      } catch (error) {
        logger.error("Supabase getSession failed", { error });
        return null;
      }
    },

    async getUser(userId: string): Promise<User | null> {
      try {
        const admin = await getAdmin();
        const { data, error } = await admin.auth.admin.getUserById(userId);
        if (error) return null;
        return mapUser(data.user);
      } catch (error) {
        logger.error("Supabase getUser failed", { userId, error });
        return null;
      }
    },

    async createUser(data: CreateUserInput): Promise<User> {
      const admin = await getAdmin();
      const { data: res, error } = await admin.auth.admin.createUser({
        ...(data.email ? { email: data.email } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.password ? { password: data.password } : {}),
        user_metadata: {
          ...(data.name ? { full_name: data.name } : {}),
          ...(data.imageUrl ? { avatar_url: data.imageUrl } : {}),
        },
        email_confirm: true,
      });
      if (error) throw new Error(`Supabase createUser failed: ${error.message}`);
      const user = mapUser(res.user);
      if (!user) throw new Error("Supabase createUser: no user returned");
      return user;
    },

    async getOrganization(_orgId: string): Promise<Organization | null> {
      logger.warn("Supabase provider does not support getOrganization — use @nebutra/tenant.");
      return null;
    },

    async getUserOrganizations(_userId: string): Promise<Organization[]> {
      logger.warn("Supabase provider does not support getUserOrganizations — use @nebutra/tenant.");
      return [];
    },

    async createOrganization(_data: CreateOrgInput): Promise<Organization> {
      throw new Error(
        "Supabase provider does not support createOrganization — use @nebutra/tenant.",
      );
    },

    async signIn(method: SignInMethod): Promise<SignInResult> {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(url!, anonKey!);

        switch (method.type) {
          case "email-password": {
            const { data, error } = await client.auth.signInWithPassword({
              email: method.email,
              password: method.password,
            });
            if (error)
              return { ok: false, error: { code: "invalid-credentials", message: error.message } };
            return { ok: true, userId: data.user?.id };
          }
          case "oauth": {
            const { data, error } = await client.auth.signInWithOAuth({
              provider: method.provider as Parameters<
                typeof client.auth.signInWithOAuth
              >[0]["provider"],
              options: { ...(method.redirectUrl ? { redirectTo: method.redirectUrl } : {}) },
            });
            if (error) return { ok: false, error: { code: "unknown", message: error.message } };
            return { ok: true, ...(data.url ? { redirectTo: data.url } : {}) };
          }
          case "phone": {
            const { error } = await client.auth.signInWithOtp({ phone: method.phone });
            if (error) return { ok: false, error: { code: "unknown", message: error.message } };
            return { ok: true };
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
        const message = error instanceof Error ? error.message : "Sign-in failed";
        return { ok: false, error: { code: "unknown", message } };
      }
    },

    async signOut(request: Request): Promise<void> {
      const token = extractBearerToken(request);
      if (!token) return;
      try {
        const admin = await getAdmin();
        await admin.auth.admin.signOut(token);
      } catch (error) {
        logger.error("Supabase signOut failed", { error });
      }
    },

    middleware() {
      // Supabase session refresh is handled client-side via @supabase/ssr.
      // Server-side token validation happens in getSession — no middleware needed.
      return async (_req: Request): Promise<Response | undefined> => undefined;
    },

    async handleWebhook(request: Request): Promise<void> {
      const body = await request.text();
      const secret = process.env.SUPABASE_WEBHOOK_SECRET;
      if (secret) {
        const signature = request.headers.get("x-supabase-signature") ?? "";
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        if (signature !== expected) {
          throw new Error("Supabase webhook: signature verification failed");
        }
      }
      logger.info("Supabase auth webhook received", { bodyLength: body.length });
    },
  };
}
