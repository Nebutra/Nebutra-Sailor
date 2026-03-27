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

// China Payment (Alipay + WeChat Pay via aggregator)
export {
  createChinaPayOrder,
  getChinaPayConfig,
  initChinaPay,
  queryChinaPayOrder,
  verifyChinaPayWebhook,
} from "./chinapay/index.js";
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
} from "./config/index.js";
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
} from "./credits/index.js";
// Entitlements
export {
  checkEntitlement,
  FEATURES,
  getEntitlements,
  grantEntitlement,
  incrementUsage,
  initializePlanEntitlements,
  isPlanFeature,
  PLAN_FEATURES,
  requireEntitlement,
  resetUsage,
  revokeEntitlement,
} from "./entitlements/index.js";
// LemonSqueezy
export {
  cancelLemonSubscription,
  createLemonCheckout,
  getLemonCustomerPortalUrl,
  getLemonSqueezyConfig,
  getLemonSubscription,
  initLemonSqueezy,
} from "./lemonsqueezy/index.js";
// Polar
export {
  cancelPolarSubscription,
  createPolarCheckout,
  getPolar,
  getPolarSubscription,
  initPolar,
  listPolarProducts,
} from "./polar/index.js";
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
} from "./stripe/index.js";
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
} from "./subscriptions/index.js";
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
} from "./types.js";
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
} from "./types.js";
// Usage
export {
  calculateOverageCost,
  checkUsageLimit,
  flushUsageBuffer,
  formatUsage,
  getCurrentPeriod,
  getPlanUsageLimit,
  recordUsage,
} from "./usage/index.js";
