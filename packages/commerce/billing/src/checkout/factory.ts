import { isMainlandMarket } from "@nebutra/contracts/market";
import { isCreemConfigured } from "../creem/index";
import type { CheckoutConfig, CheckoutProvider, CheckoutProviderType } from "./types";

// =============================================================================
// Checkout Factory — provider-agnostic checkout creation
// =============================================================================
// Mirrors the `@nebutra/queue` pattern. Resolution order:
//   1. Explicit config passed to `getCheckout(config)`
//   2. `BILLING_PROVIDER` environment variable
//   3. Auto-detection from the keys that are present (ADR 2026-09-26):
//      Creem is the card rail, WeChat Pay / Alipay ("chinapay") the mainland
//      rail, and `NEBUTRA_LOCALE=cn` puts the mainland rail first
//   4. Fallback to "manual" (no real payment, dev/admin flows only)
//
// Stripe is a legacy adapter (ADR 2026-09-26: "retired from new work"). It is
// never auto-detected — a STRIPE_SECRET_KEY left in an env no longer routes
// checkouts to it. Only `BILLING_PROVIDER=stripe` selects it.
// =============================================================================

/**
 * Detect which checkout provider to use based on environment variables.
 *
 * - `BILLING_PROVIDER` wins when set.
 * - Mainland market (`NEBUTRA_LOCALE=cn`): chinapay when a wallet is
 *   configured, else Creem.
 * - Otherwise: Creem when configured, else chinapay.
 * - Nothing configured: "manual".
 */
export function detectProvider(
  env: Record<string, string | undefined> = process.env,
): CheckoutProviderType {
  const explicit = env.BILLING_PROVIDER?.trim();
  if (explicit) {
    return explicit as CheckoutProviderType;
  }
  const creem = isCreemConfigured(env);
  const chinapay = isChinaPayConfigured(undefined, env);
  if (isMainlandMarket(env) && chinapay) return "chinapay";
  if (creem) return "creem";
  if (chinapay) return "chinapay";
  return "manual";
}

/**
 * Whether a wallet has merchant credentials. These are the variables
 * chinapay/client.ts reads — detection used to look at a CHINAPAY_APP_ID
 * nothing else set, so a fully configured merchant still fell to "manual".
 */
export function isChinaPayConfigured(
  method?: "alipay" | "wechat",
  env: Record<string, string | undefined> = process.env,
): boolean {
  const alipay = Boolean(env.ALIPAY_APP_ID);
  const wechat = Boolean(env.WECHATPAY_MCHID);
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
    case "creem": {
      const { CreemCheckoutProvider } = await import("./creem");
      return new CreemCheckoutProvider();
    }
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
