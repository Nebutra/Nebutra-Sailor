import { detectProvider } from "./factory";
import type { CheckoutProviderType } from "./types";

export type BillingProviderReadinessStatus = "disabled" | "degraded" | "ready";

export interface BillingProviderReadinessInput {
  env?: Record<string, string | undefined>;
  selfServiceEnabled?: boolean;
  requiredPriceEnvVars?: string[];
}

export interface BillingProviderReadiness {
  provider: CheckoutProviderType;
  status: BillingProviderReadinessStatus;
  checkoutReady: boolean;
  portalReady: boolean;
  missing: string[];
  title: string;
  description: string;
}

function detectProviderFromEnv(env: Record<string, string | undefined>): CheckoutProviderType {
  const previous = {
    BILLING_PROVIDER: process.env.BILLING_PROVIDER,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    POLAR_ACCESS_TOKEN: process.env.POLAR_ACCESS_TOKEN,
    LEMONSQUEEZY_API_KEY: process.env.LEMONSQUEEZY_API_KEY,
    CHINAPAY_APP_ID: process.env.CHINAPAY_APP_ID,
  };

  try {
    process.env.BILLING_PROVIDER = env.BILLING_PROVIDER ?? "";
    process.env.STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY ?? "";
    process.env.POLAR_ACCESS_TOKEN = env.POLAR_ACCESS_TOKEN ?? "";
    process.env.LEMONSQUEEZY_API_KEY = env.LEMONSQUEEZY_API_KEY ?? "";
    process.env.CHINAPAY_APP_ID = env.CHINAPAY_APP_ID ?? "";
    return detectProvider();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function isPresent(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function resolveBillingProviderReadiness({
  env = process.env,
  selfServiceEnabled = true,
  requiredPriceEnvVars = [],
}: BillingProviderReadinessInput = {}): BillingProviderReadiness {
  const provider = detectProviderFromEnv(env);

  if (!selfServiceEnabled) {
    return {
      provider: "manual",
      status: "disabled",
      checkoutReady: false,
      portalReady: false,
      missing: [],
      title: "Billing self-service is disabled",
      description:
        "The billing feature flag or checkout mode is off, so plan changes remain read-only.",
    };
  }

  if (provider !== "stripe") {
    return {
      provider,
      status: "degraded",
      checkoutReady: false,
      portalReady: false,
      missing: provider === "manual" ? ["BILLING_PROVIDER"] : [],
      title: "Subscription self-service needs Stripe",
      description:
        "A non-Stripe or manual provider is detected. Checkout and hosted billing portal actions stay disabled until a supported subscription route is configured.",
    };
  }

  const missing = [
    ...(!isPresent(env.STRIPE_SECRET_KEY) ? ["STRIPE_SECRET_KEY"] : []),
    ...requiredPriceEnvVars.filter((key) => !isPresent(env[key])),
  ];
  const missingPrices = requiredPriceEnvVars.filter((key) => !isPresent(env[key]));
  const hasSecret = isPresent(env.STRIPE_SECRET_KEY);

  if (missing.length > 0) {
    return {
      provider: "stripe",
      status: "degraded",
      checkoutReady: false,
      portalReady: hasSecret,
      missing,
      title: hasSecret ? "Stripe is partially configured" : "Stripe is selected but not configured",
      description:
        missingPrices.length > 0
          ? "Customer portal can be requested, but paid plan checkout stays disabled until every paid plan has a Stripe price id."
          : "Set STRIPE_SECRET_KEY before enabling checkout or customer portal actions.",
    };
  }

  return {
    provider: "stripe",
    status: "ready",
    checkoutReady: true,
    portalReady: true,
    missing: [],
    title: "Stripe self-service is ready",
    description: "Checkout and hosted billing portal actions can be exposed for configured plans.",
  };
}
