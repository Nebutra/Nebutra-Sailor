import type { AuthProviderId } from "@nebutra/auth";

const supportedAuthProviders = new Set<AuthProviderId>(["better-auth", "dev"]);

export function getViteAuthProvider(): AuthProviderId {
  const raw = import.meta.env.VITE_AUTH_PROVIDER;
  return raw && supportedAuthProviders.has(raw as AuthProviderId)
    ? (raw as AuthProviderId)
    : "better-auth";
}

export function getViteAuthConfig(): Record<string, unknown> {
  return {
    apiUrl: import.meta.env.VITE_AUTH_API_URL ?? "/api/auth",
  };
}

export function getVitePublicEnv(): Record<string, string | undefined> {
  return {
    NODE_ENV: import.meta.env.MODE,
    FEATURE_FLAG_BILLING: import.meta.env.VITE_FEATURE_FLAG_BILLING,
    NEBUTRA_BILLING_CHECKOUT_MODE: import.meta.env.VITE_NEBUTRA_BILLING_CHECKOUT_MODE,
    PRICE_ID_PRO_MONTHLY: import.meta.env.VITE_PRICE_ID_PRO_MONTHLY,
    PRICE_ID_PRO_YEARLY: import.meta.env.VITE_PRICE_ID_PRO_YEARLY,
    STARTUP_AGENT_OS_PROTOTYPE: import.meta.env.VITE_STARTUP_AGENT_OS_PROTOTYPE,
  };
}
