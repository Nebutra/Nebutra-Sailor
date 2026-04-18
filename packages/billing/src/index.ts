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

// Checkout (provider-agnostic abstraction)
export {
  type CheckoutConfig,
  type CheckoutProvider,
  type CheckoutProviderType,
  CREDIT_PURCHASE_METADATA_TYPE,
  type CreditPurchaseInput,
  CreditPurchaseInputSchema,
  type CreditPurchaseMetadata,
  type CreditPurchaseSession,
  type CreditPurchaseWebhookInput,
  type CreditPurchaseWebhookResult,
  detectProvider,
  getCheckout,
  handleCreditPurchaseWebhook,
} from "./checkout/index";
// China Payment (Alipay + WeChat Pay via aggregator)
export {
  createChinaPayOrder,
  getChinaPayConfig,
  initChinaPay,
  queryChinaPayOrder,
  verifyChinaPayWebhook,
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
// Credits
export {
  addBonusCredits,
  addCredits,
  creditsToDollars,
  deductCredits,
  dollarsToCredits,
  formatCredits,
  getCreditBalance,
  getCreditTransactions,
  hasEnoughCredits,
  refundCredits,
} from "./credits/index";
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
// LemonSqueezy
export {
  cancelLemonSubscription,
  createLemonCheckout,
  getLemonCustomerPortalUrl,
  getLemonSqueezyConfig,
  getLemonSubscription,
  initLemonSqueezy,
} from "./lemonsqueezy/index";
// Polar
export {
  cancelPolarSubscription,
  createPolarCheckout,
  getPolar,
  getPolarSubscription,
  initPolar,
  listPolarProducts,
} from "./polar/index";
// Stripe
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
