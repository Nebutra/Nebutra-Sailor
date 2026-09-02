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
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_VERIFY_SERVICE_SID?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  AUTH_COOKIE_DOMAIN?: string;
  NEXT_PUBLIC_AUTH_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
  ACCESS_GATE_MODE?: string;
  NEXT_PUBLIC_ACCESS_GATE_MODE?: string;
  NEXT_PUBLIC_WECHAT_APP_ID?: string;
}

declare namespace NodeJS {
  interface ProcessEnv {
    ACCESS_GATE_MODE?: string;
    NEXT_PUBLIC_ACCESS_GATE_MODE?: string;
    NEXT_PUBLIC_WECHAT_APP_ID?: string;
    AUTH_ENABLED_PHONE_PROVIDERS?: string;
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_VERIFY_SERVICE_SID?: string;
    TURNSTILE_SECRET?: string;
    TURNSTILE_SECRET_KEY?: string;
  }
}
