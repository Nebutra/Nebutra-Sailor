import { z } from "zod";

// =============================================================================
// Checkout types — provider-agnostic abstraction over payment checkout flows
// =============================================================================
// A provider opens a payment session for one PaymentOrder (see ../orders). It
// knows the order id, what to call it and how much to charge — never what is
// being sold. That lives in the order's fulfillment spec.
//
// Which providers are live is decided by the keys in the env (CREEM_API_KEY,
// ALIPAY_APP_ID, WECHATPAY_MCHID); the buyer's chosen method picks among them.
// =============================================================================

export type CheckoutProviderType = "creem" | "stripe" | "chinapay" | "manual";

export const PaymentSessionInputSchema = z.object({
  /** The PaymentOrder id — also the provider's merchant order number. */
  orderId: z.string().min(1).max(32),
  organizationId: z.string().min(1),
  /** Shown to the buyer on the provider's page. */
  title: z.string().min(1),
  amountMinor: z.number().int().positive(),
  currency: z.string().length(3),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  customerEmail: z.string().email().optional(),
  /** ChinaPay only: which wallet the buyer chose. */
  method: z.enum(["alipay", "wechat"]).optional(),
  /** ChinaPay only: `qr` for a desktop to scan, `h5` to open the wallet on this phone. */
  channel: z.enum(["qr", "h5"]).optional(),
  /** ChinaPay H5 only: the buyer's IP, which WeChat Pay H5 requires. */
  clientIp: z.string().optional(),
});

export type PaymentSessionInput = z.infer<typeof PaymentSessionInputSchema>;

export interface PaymentSession {
  /** `redirect`: send the browser to `url`. `qr`: render `url` as a QR code. */
  kind: "redirect" | "qr";
  url: string;
  /** The provider's own id for this session, when it differs from the order id. */
  providerRef?: string;
  provider: CheckoutProviderType;
  expiresAt?: Date;
}

export interface CheckoutProvider {
  readonly name: CheckoutProviderType;
  createPaymentSession(input: PaymentSessionInput): Promise<PaymentSession>;
}

export type CheckoutConfig =
  | { provider: "creem" }
  | { provider: "stripe"; secretKey?: string }
  | { provider: "chinapay" }
  | { provider: "manual" };

/** Stripe metadata key carrying the PaymentOrder id back to the webhook. */
export const PAYMENT_ORDER_METADATA_KEY = "paymentOrderId" as const;

/**
 * Legacy marker from before payment orders: a Stripe session carrying it
 * credits the organization straight from its metadata. Kept only so a session
 * opened before the upgrade still completes; nothing creates one any more.
 */
export const CREDIT_PURCHASE_METADATA_TYPE = "credit_purchase" as const;

export interface CreditPurchaseMetadata {
  type: typeof CREDIT_PURCHASE_METADATA_TYPE;
  organizationId: string;
  /** Stored as string because most providers coerce metadata values to strings. */
  creditAmount: string;
  referenceId?: string;
}
