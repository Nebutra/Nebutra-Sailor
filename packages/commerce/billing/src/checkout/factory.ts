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
 * Precedence when multiple are set: stripe → chinapay.
 * Set `BILLING_PROVIDER` to override.
 */
export function detectProvider(): CheckoutProviderType {
  const explicit = process.env.BILLING_PROVIDER;
  if (explicit) {
    return explicit as CheckoutProviderType;
  }
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  if (isChinaPayConfigured()) return "chinapay";
  return "manual";
}

/**
 * Whether a wallet has merchant credentials. These are the variables
 * chinapay/client.ts reads — detection used to look at a CHINAPAY_APP_ID
 * nothing else set, so a fully configured merchant still fell to "manual".
 */
export function isChinaPayConfigured(method?: "alipay" | "wechat"): boolean {
  const alipay = Boolean(process.env.ALIPAY_APP_ID);
  const wechat = Boolean(process.env.WECHATPAY_MCHID);
  if (method === "alipay") return alipay;
  if (method === "wechat") return wechat;
  return alipay || wechat;
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
      const { StripeCheckoutProvider } = await import("./stripe");
      return new StripeCheckoutProvider();
    }
    case "chinapay": {
      const { ChinaPayCheckoutProvider } = await import("./chinapay");
      return new ChinaPayCheckoutProvider();
    }
    default: {
      const { ManualCheckoutProvider } = await import("./manual");
      return new ManualCheckoutProvider();
    }
  }
}
