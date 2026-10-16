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

function isPresent(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function resolveBillingProviderReadiness({
  env = process.env,
  selfServiceEnabled = true,
  requiredPriceEnvVars = [],
}: BillingProviderReadinessInput = {}): BillingProviderReadiness {
  const provider = detectProvider(env);

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
      title: "Subscription self-service is not available",
      description:
        "Plan subscriptions still run on the legacy Stripe adapter (ADR 2026-09-26), selected only with BILLING_PROVIDER=stripe. One-time payments through Creem, WeChat Pay and Alipay are not affected.",
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
