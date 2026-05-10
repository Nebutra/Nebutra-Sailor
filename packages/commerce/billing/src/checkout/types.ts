import { z } from "zod";

// =============================================================================
// Checkout types — provider-agnostic abstraction over payment checkout flows
// =============================================================================
// The purpose of this layer is to give application code a single interface for
// initiating credit purchases (or other one-time payments) regardless of which
// payment provider the customer has configured.
//
// Customers pick a provider via env vars (STRIPE_SECRET_KEY / POLAR_ACCESS_TOKEN
// / LEMONSQUEEZY_API_KEY / CHINAPAY_APP_ID / BILLING_PROVIDER override) and the
// factory wires the right adapter at runtime.
// =============================================================================

export type CheckoutProviderType = "stripe" | "polar" | "lemonsqueezy" | "chinapay" | "manual";

export const CreditPurchaseInputSchema = z.object({
  organizationId: z.string().min(1),
  creditAmount: z.number().int().positive(), // Number of credits to grant
  amount: z.number().positive(), // Dollar amount to charge
  currency: z.string().length(3).default("USD"),
  customerEmail: z.string().email().optional(),
  customerId: z.string().optional(), // Pre-existing provider customer id
  priceId: z.string().optional(), // Stripe price / Polar product / Lemon variant id
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  referenceId: z.string().optional(), // Idempotency / tracking key
  metadata: z.record(z.string(), z.string()).optional(),
});

export type CreditPurchaseInput = z.infer<typeof CreditPurchaseInputSchema>;

export interface CreditPurchaseSession {
  url: string;
  sessionId: string;
  provider: CheckoutProviderType;
  expiresAt?: Date;
}

export interface CheckoutProvider {
  readonly name: CheckoutProviderType;
  createCreditPurchase(input: CreditPurchaseInput): Promise<CreditPurchaseSession>;
}

export type CheckoutConfig =
  | { provider: "stripe"; secretKey?: string }
  | { provider: "polar"; accessToken?: string; sandbox?: boolean }
  | { provider: "lemonsqueezy"; apiKey?: string; storeId?: string }
  | { provider: "chinapay"; appId?: string; appSecret?: string; method?: "alipay" | "wechat" }
  | { provider: "manual" };

/**
 * Metadata marker embedded in every checkout session so that webhook handlers
 * can distinguish credit purchases from subscriptions or other payment intents.
 */
export const CREDIT_PURCHASE_METADATA_TYPE = "credit_purchase" as const;

export interface CreditPurchaseMetadata {
  type: typeof CREDIT_PURCHASE_METADATA_TYPE;
  organizationId: string;
  /** Stored as string because most providers coerce metadata values to strings. */
  creditAmount: string;
  referenceId?: string;
}
