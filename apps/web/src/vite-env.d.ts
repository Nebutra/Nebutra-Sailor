/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_GATEWAY_URL?: string;
  readonly VITE_AUTH_PROVIDER?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_CLERK_JS_URL?: string;
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_FEATURE_FLAG_BILLING?: string;
  readonly VITE_NEBUTRA_BILLING_CHECKOUT_MODE?: string;
  readonly VITE_PRICE_ID_PRO_MONTHLY?: string;
  readonly VITE_PRICE_ID_PRO_YEARLY?: string;
  readonly VITE_STARTUP_AGENT_OS_PROTOTYPE?: string;
}
