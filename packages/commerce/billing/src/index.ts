/**
 * @nebutra/billing
 *
 * Comprehensive billing & monetization infrastructure for Nebutra
 *
 * Features:
 * - Stripe integration (subscriptions, payments, customers)
 * - Usage tracking and metering
 * - Credits system
 * - Feature entitlements
 * - Plan management
 *
 * @example
 * ```typescript
 * import {
 *   initStripe,
 *   createCheckoutSession,
 *   recordUsage,
 *   checkEntitlement,
 * } from "@nebutra/billing";
 *
 * // Initialize Stripe
 * initStripe({ secretKey: process.env.STRIPE_SECRET_KEY! });
 *
 * // Create checkout session
 * const session = await createCheckoutSession({
 *   customerId: "cus_xxx",
 *   priceId: "price_xxx",
 *   successUrl: "https://app.example.com/success",
 *   cancelUrl: "https://app.example.com/cancel",
 * });
 *
 * // Record usage
 * recordUsage({
 *   organizationId: "org_xxx",
 *   type: "AI_TOKEN",
 *   quantity: 1000,
 *   resource: "gpt-5.2",
 * });
 *
 * // Check feature entitlement
 * const result = checkEntitlement("org_xxx", "ai.chat");
 * if (result.allowed) {
 *   // Proceed with the feature
 * }
 * ```
 */

// Checkout catalog — server-owned plan → price mapping
export {
  assertProductReturnUrl,
  CHECKOUT_INTERVALS,
  CHECKOUT_PLANS,
  type CheckoutInterval,
  type CheckoutOffer,
  type CheckoutPlanId,
  type CheckoutSelection,
  parseCheckoutSelection,
  resolveCheckoutOffer,
  resolveCheckoutReturnUrls,
} from "./catalog/checkout-plan";
// Checkout (provider-agnostic abstraction)
export {
  type BillingProviderReadiness,
  type BillingProviderReadinessInput,
  type BillingProviderReadinessStatus,
  type CheckoutConfig,
  type CheckoutProvider,
  type CheckoutProviderType,
  CREDIT_PURCHASE_METADATA_TYPE,
  type CreditPurchaseMetadata,
  type CreditPurchaseWebhookInput,
  type CreditPurchaseWebhookResult,
  detectProvider,
  getCheckout,
  handleCreditPurchaseWebhook,
  isChinaPayConfigured,
  PAYMENT_ORDER_METADATA_KEY,
  type PaymentSession,
  type PaymentSessionInput,
  PaymentSessionInputSchema,
  refundStripeCheckoutSession,
  resolveBillingProviderReadiness,
} from "./checkout/index";
// China Payment (official WeChat Pay APIv3 + Alipay Open Platform, no aggregator)
export {
  ALIPAY_NOTIFY_SUCCESS_BODIES,
  type AlipayConfig,
  type AlipayNotificationFields,
  buildAlipayWapPayUrl,
  type ChinaPayChannel,
  type ChinaPayMethod,
  type ChinaPayOrder,
  createAlipayPrecreateOrder,
  createChinaPayOrder,
  createWechatH5Order,
  createWechatNativeOrder,
  ensurePem,
  getAlipayConfig,
  getWechatPayConfig,
  initAlipay,
  initWechatPay,
  queryAlipayOrder,
  queryChinaPayOrder,
  queryWechatOrder,
  type RefundChinaPayOrderInput,
  refundAlipayOrder,
  refundChinaPayOrder,
  refundWechatOrder,
  resetChinaPayConfig,
  verifyAlipayNotification,
  verifyAndDecryptWechatNotification,
  WECHAT_NOTIFY_FAIL,
  WECHAT_NOTIFY_OK,
  type WechatNotificationHeaders,
  type WechatPayConfig,
  type WechatPaymentResource,
} from "./chinapay/index";
// Plan Config (Database-driven)
export {
  type CacheAdapter,
  type FeatureValue,
  getPlanConfig,
  initPlanConfig,
  type LimitConfig,
  type PlanConfig,
  PlanConfigService,
  type ResolvedConfig,
} from "./config/index";
// Credits — one balance per organization per product (ADR 2026-09-27)
export {
  addBonusCredits,
  addCredits,
  assertWalletProduct,
  type CreditLotSource,
  creditsToDollars,
  deductCredits,
  dollarsToCredits,
  type ExpiringCredits,
  expireCreditLots,
  formatCredits,
  getCreditAllowanceForPlan,
  getCreditBalance,
  getCreditBalanceFresh,
  getCreditTransactions,
  getExpiringCredits,
  hasEnoughCredits,
  hasEnoughCreditsFresh,
  invalidateCreditCache,
  refundCredits,
  type WalletProduct,
} from "./credits/index";
// Creem — the global card rail, merchant of record (ADR 2026-09-26)
export {
  type CreemCheckout,
  type CreemConfig,
  type CreemOrder,
  type CreemWebhookEvent,
  createCreemCheckout,
  getCreemCheckout,
  getCreemConfig,
  isCreemConfigured,
  refundCreemOrder,
  verifyCreemSignature,
} from "./creem/index";
// Host DB wiring (no private @nebutra/db import)
export {
  type BillingTenantDb,
  configureBillingTenantDb,
  type InputJsonValue,
} from "./db";
// Entitlements
export {
  checkEntitlement,
  checkEntitlementUsage,
  FEATURES,
  getEntitlements,
  grantEntitlement,
  incrementUsage,
  initializePlanEntitlements,
  isPlanFeature,
  METER_TO_PLAN_LIMIT,
  PLAN_FEATURES,
  requireEntitlement,
  requireEntitlementUsage,
  resetUsage,
  revokeEntitlement,
  type UsageEntitlementResult,
} from "./entitlements/index";
// Fulfillment — what a paid order hands over, keyed by offer.fulfillment.type
export {
  type FulfillmentContext,
  type FulfillmentHandler,
  getFulfillment,
  type RevocationContext,
  type RevocationResult,
  registerFulfillment,
} from "./fulfillment/index";
// Memberships — a product's paid tier for a period (ADR 2026-09-27)
export {
  applyMembershipPurchase,
  GRANT_PERIOD_DAYS,
  getMembership,
  grantDueMemberships,
  type Membership,
  revokeMembershipPurchase,
} from "./memberships/index";
// Offers — what can be bought (data, replaced by the host at boot)
export {
  type AmountRange,
  configureOffers,
  configureOffersFromEnv,
  DEFAULT_OFFERS,
  type FulfillmentSpec,
  getOffer,
  type LockedFulfillmentSpec,
  listOffers,
  type Offer,
  type OfferCurrency,
  offerCurrencies,
  priceOffer,
  toMajorString,
  toMinorUnits,
} from "./offers/index";
// Payment orders — create, settle, reconcile, refund
export {
  type CreatedPaymentOrder,
  type CreatePaymentOrderInput,
  configurePaymentOrderStore,
  createPaymentOrder,
  fulfillPaymentOrder,
  getPaymentOrder,
  isPaymentMethodAvailable,
  listPaymentOrders,
  type PaymentMethod,
  type PaymentOrderRecord,
  type PaymentOrderStatus,
  type PaymentOrderStore,
  type ReconcileResult,
  type RefundPaymentOrderInput,
  type RefundPaymentOrderResult,
  reconcilePaymentOrders,
  refundPaymentOrder,
  type SettleOutcome,
  type SettlePaymentOrderInput,
  settlePaymentOrder,
} from "./orders/index";
export {
  createBillingPortalSession,
  createCheckoutSession,
  createCustomer,
  deleteCustomer,
  getCustomer,
  getOrCreateCustomer,
  getStripe,
  getWebhookSecret,
  initStripe,
  updateCustomer,
} from "./stripe/index";
// Stripe
export {
  advanceStripeTestClock,
  type ClockWebhookInboxState,
  clockAdvanceCrossesPeriodEnd,
  createStripeTestClock,
  decideClockWebhookReplay,
  invoiceEventsAfterClockAdvance,
  isStripeTestModeSecret,
  requireStripeTestClockSecret,
  STRIPE_TEST_CLOCK_IN_FLIGHT_MS,
  type StripeTestClock,
  type StripeTestClockApi,
} from "./stripe/test-clock";
// Subscriptions
export {
  cancelStripeSubscription,
  createStripeSubscription,
  getCustomerSubscriptions,
  getStripeSubscription,
  mapStripeStatusToLocal,
  pauseStripeSubscription,
  previewSubscriptionChange,
  resumeStripeSubscription,
  unpauseStripeSubscription,
  updateStripeSubscription,
} from "./subscriptions/index";
// Types
export type {
  BillingInterval,
  CheckEntitlementInput,
  CreateSubscriptionInput,
  CreditTransactionType,
  InvoiceStatus,
  PaymentMethodType,
  Plan,
  PlanLimits,
  PricingConfig,
  PurchaseCreditsInput,
  RecordUsageInput,
  SubscriptionStatus,
  UpdateSubscriptionInput,
  UsagePricing,
  UsageType,
} from "./types";
// Constants
// Schemas
// Errors
export {
  BillingError,
  CheckEntitlementSchema,
  CreateSubscriptionSchema,
  DEFAULT_PLAN_LIMITS,
  DEFAULT_PRICING,
  DEFAULT_USAGE_PRICING,
  EntitlementError,
  PaymentError,
  PurchaseCreditsSchema,
  RecordUsageSchema,
  SubscriptionError,
  UpdateSubscriptionSchema,
  UsageError,
} from "./types";
// Usage
export {
  calculateOverageCost,
  checkUsageLimit,
  flushUsageBuffer,
  formatUsage,
  type GetUsageOptions,
  getCurrentPeriod,
  getPlanUsageLimit,
  getUsage,
  recordUsage,
} from "./usage/index";
