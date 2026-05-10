import type { CheckoutConfig, CheckoutProvider, CheckoutProviderType } from "./types";

// =============================================================================
// Checkout Factory — provider-agnostic checkout creation
// =============================================================================
// Mirrors the `@nebutra/queue` pattern. Resolution order:
//   1. Explicit config passed to `getCheckout(config)`
//   2. `BILLING_PROVIDER` environment variable
//   3. Auto-detection based on which provider's credentials are configured
//   4. Fallback to "manual" (no real payment, dev/admin flows only)
// =============================================================================

/**
 * Detect which checkout provider to use based on environment variables.
 *
 * Precedence when multiple are set: stripe → polar → lemonsqueezy → chinapay.
 * Set `BILLING_PROVIDER` to override.
 */
export function detectProvider(): CheckoutProviderType {
  const explicit = process.env.BILLING_PROVIDER;
  if (explicit) {
    return explicit as CheckoutProviderType;
  }
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  if (process.env.POLAR_ACCESS_TOKEN) return "polar";
  if (process.env.LEMONSQUEEZY_API_KEY) return "lemonsqueezy";
  if (process.env.CHINAPAY_APP_ID) return "chinapay";
  return "manual";
}

/**
 * Resolve a checkout provider.
 *
 * Providers are loaded via dynamic import so unused SDKs are never evaluated.
 *
 * @example
 * ```ts
 * // Auto-detect
 * const checkout = await getCheckout();
 * const session = await checkout.createCreditPurchase({
 *   organizationId: "org_123",
 *   creditAmount: 1000,
 *   amount: 9.99,
 *   successUrl: "https://app.example.com/success",
 *   cancelUrl: "https://app.example.com/cancel",
 * });
 * ```
 */
export async function getCheckout(config?: CheckoutConfig): Promise<CheckoutProvider> {
  const provider = config?.provider ?? detectProvider();

  switch (provider) {
    case "stripe": {
      const { StripeCheckoutProvider } = await import("./stripe.js");
      return new StripeCheckoutProvider();
    }
    case "polar": {
      const { PolarCheckoutProvider } = await import("./polar.js");
      return new PolarCheckoutProvider();
    }
    case "lemonsqueezy": {
      const { LemonCheckoutProvider } = await import("./lemonsqueezy.js");
      return new LemonCheckoutProvider();
    }
    case "chinapay": {
      const { ChinaPayCheckoutProvider } = await import("./chinapay.js");
      return new ChinaPayCheckoutProvider();
    }
    case "manual":
    default: {
      const { ManualCheckoutProvider } = await import("./manual.js");
      return new ManualCheckoutProvider();
    }
  }
}
