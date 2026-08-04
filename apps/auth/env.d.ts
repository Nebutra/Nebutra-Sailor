/**
 * Cloudflare Worker bindings for OpenNext auth-center.
 * Types stay minimal (no hard dependency on @cloudflare/workers-types).
 */
interface HyperdriveBinding {
  connectionString: string;
}

interface CloudflareEnv {
  ASSETS?: { fetch: typeof fetch };
  HYPERDRIVE?: HyperdriveBinding;
  /** Optional plaintext fallback when Hyperdrive is not bound (local/dev). */
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  AUTH_COOKIE_DOMAIN?: string;
  NEXT_PUBLIC_AUTH_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
}
