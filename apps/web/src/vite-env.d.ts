/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_GATEWAY_URL?: string;
  readonly VITE_AUTH_PROVIDER?: string;
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_FEATURE_FLAG_BILLING?: string;
  readonly VITE_NEBUTRA_BILLING_CHECKOUT_MODE?: string;
  readonly VITE_PRICE_ID_PRO_MONTHLY?: string;
  readonly VITE_PRICE_ID_PRO_YEARLY?: string;
  readonly VITE_STARTUP_AGENT_OS_PROTOTYPE?: string;
  /** A separate auth center to hand sign-in to; unset → sign-in stays in the app. */
  readonly VITE_AUTH_URL?: string;
  /** Set by `pnpm dev` (scripts/dev/preview.ts) for the /welcome page. */
  readonly VITE_SAILOR_PREVIEW?: string;
  readonly VITE_SAILOR_SITE_URL?: string;
  readonly VITE_SAILOR_API_URL?: string;
  readonly VITE_SAILOR_CAPABILITIES?: string;
}
