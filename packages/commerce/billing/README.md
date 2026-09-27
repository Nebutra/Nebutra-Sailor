# @nebutra/billing

Status: **Foundation** — the core contract is production-usable; the provider
adapters need credentials and the UI surfaces belong to the consuming app.

Comprehensive billing and monetization infrastructure for Nebutra SaaS platform.

The current payments pair is **Creem** (cards worldwide, merchant of record —
collects and remits sales tax/VAT) **+ WeChat Pay / Alipay** (mainland China),
per [ADR 2026-09-26](../../../docs/architecture/2026-09-26-creem-global-payments.md).
Stripe is legacy-only: its code stays so checkouts opened before the switch
still complete, but nothing new is built on it and it is not advertised as a
current rail.

## Features

- **Creem Integration** - Global card checkout, merchant of record (tax handled), refunds
- **Wallet Rails** - WeChat Pay / Alipay for mainland China
- **Usage Tracking** - Metering, limits, overage pricing
- **Credits System** - Balance management, transactions, purchases
- **Entitlements** - Feature flags, plan-based access control
- **Webhook Handling** - Automated payment-order settlement
- **Stripe (legacy)** - Kept only for checkouts opened before the Creem switch

## Installation

```bash
pnpm add @nebutra/billing
```

## Quick Start

```typescript
import {
  isCreemConfigured,
  createCreemCheckout,
  recordUsage,
  checkEntitlement,
} from "@nebutra/billing";

// Creem is live once CREEM_API_KEY and CREEM_PRODUCT_ID are set
if (isCreemConfigured(process.env)) {
  const checkout = await createCreemCheckout({
    requestId: "order_xxx",
    customPriceMinor: 2900,
    successUrl: "https://app.example.com/success",
  });
}

// Record usage
recordUsage({
  organizationId: "org_xxx",
  type: "AI_TOKEN",
  quantity: 1000,
  resource: "gpt-5.2",
});

// Check feature entitlement
const result = checkEntitlement("org_xxx", "ai.chat");
if (result.allowed) {
  // Proceed with the feature
}
```

## Configuration

Set the following environment variables:

```bash
# Creem — the current card rail (merchant of record)
CREEM_API_KEY=creem_xxx
CREEM_PRODUCT_ID=prod_xxx
CREEM_WEBHOOK_SECRET=whsec_xxx
CREEM_TEST_MODE=true   # points at test-api.creem.io

# WeChat Pay / Alipay — mainland China
WECHATPAY_MCHID=
WECHATPAY_APP_ID=
WECHATPAY_PRIVATE_KEY=
WECHATPAY_SERIAL_NO=
WECHATPAY_API_V3_KEY=
ALIPAY_APP_ID=
ALIPAY_PRIVATE_KEY=
ALIPAY_PUBLIC_KEY=
```

Legacy Stripe env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_ID_*`) are still read by the old subscription/credit-purchase
code paths under `src/stripe`, but are not part of the current setup — see
the ADR for what still depends on them.

## Modules

### Creem (`@nebutra/billing`, checkout provider `"creem"`)

```typescript
import {
  createCreemCheckout,
  getCreemCheckout,
  refundCreemOrder,
  verifyCreemSignature,
  isCreemConfigured,
} from "@nebutra/billing";

// One-time checkout — one Creem product carries every offer via custom_price
const checkout = await createCreemCheckout({
  requestId: "order_xxx",
  customPriceMinor: 2900,
  successUrl: "/success",
});
redirect(checkout.checkout_url);

// Reconcile a pending order (in case a webhook was lost)
const { status, order } = await getCreemCheckout(checkout.id);

// Refunds are full-only — Creem's API takes no amount, and looks the
// transaction up by Creem order id
await refundCreemOrder(creemOrderId);
```

Webhook: `POST /api/webhooks/creem` — see `backends/gateway/src/routes/webhooks/creem.ts`.
`checkout.completed` settles the order; the order's pre-tax amount is compared
against the locked offer price, since Creem adds tax on top as merchant of record.

### Stripe (`@nebutra/billing/stripe`) — legacy, do not build new features on this

```typescript
import {
  initStripe,
  getStripe,
  createCustomer,
  getOrCreateCustomer,
  createCheckoutSession,
  createBillingPortalSession,
} from "@nebutra/billing";

// Customer management
const customer = await createCustomer({
  email: "user@example.com",
  name: "John Doe",
  metadata: { organizationId: "org_xxx" },
});

// Checkout session — only reachable via the legacy credit_purchase path
const session = await createCheckoutSession({
  customerId: customer.id,
  priceId: "price_xxx",
  successUrl: "/success",
  cancelUrl: "/cancel",
});

// Billing portal
const portal = await createBillingPortalSession({
  customerId: customer.id,
  returnUrl: "/billing",
});
```

### Subscriptions (`@nebutra/billing/subscriptions`)

Subscriptions still run on Stripe today (legacy). When subscriptions move to
Creem, they will be Creem subscriptions (`subscription.*` events) through the
same payment-order and fulfillment seams — see the ADR.

```typescript
import {
  createStripeSubscription,
  getStripeSubscription,
  updateStripeSubscription,
  cancelStripeSubscription,
  previewSubscriptionChange,
} from "@nebutra/billing";

// Create subscription
const subscription = await createStripeSubscription({
  customerId: "cus_xxx",
  priceId: "price_xxx",
  trialDays: 14,
});

// Preview plan change
const preview = await previewSubscriptionChange({
  subscriptionId: subscription.id,
  newPriceId: "price_yyy",
});
console.log(`Proration: $${preview.proratedAmount / 100}`);

// Cancel at period end
await cancelStripeSubscription(subscription.id, { cancelAtPeriodEnd: true });
```

### Usage (`@nebutra/billing/usage`)

```typescript
import {
  recordUsage,
  checkUsageLimit,
  getPlanUsageLimit,
  calculateOverageCost,
} from "@nebutra/billing";

// Record usage
recordUsage({
  organizationId: "org_xxx",
  type: "AI_TOKEN",
  quantity: 1000,
  resource: "gpt-5.2",
});

// Check limits before operation
const limit = checkUsageLimit("org_xxx", "AI_TOKEN", 500);
if (limit.exceeded) {
  throw new Error(
    `Usage limit exceeded. Used: ${limit.current}/${limit.limit}`,
  );
}

// Calculate overage cost
const cost = calculateOverageCost("AI_TOKEN", 5000, "PRO");
```

### Credits (`@nebutra/billing/credits`)

```typescript
import {
  getCreditBalance,
  addCredits,
  deductCredits,
  hasEnoughCredits,
  getCreditTransactions,
} from "@nebutra/billing";

// One balance per organization per product — they never add up
// (ADR 2026-09-27 product wallets). Every call names the product.
const { balance } = await getCreditBalance("org_xxx", "app");
console.log(`Balance: ${balance} credits ($${creditsToDollars(balance)})`);

// Add credits
await addCredits({
  organizationId: "org_xxx",
  product: "app",
  amount: 1000,
  type: "PURCHASE",
  description: "Credit purchase",
});

// Deduct credits
if (await hasEnoughCredits("org_xxx", "app", 100)) {
  await deductCredits({
    organizationId: "org_xxx",
    product: "app",
    amount: 100,
    description: "AI generation",
  });
}
```

### Entitlements (`@nebutra/billing/entitlements`)

```typescript
import {
  checkEntitlement,
  requireEntitlement,
  initializePlanEntitlements,
  FEATURES,
  PLAN_FEATURES,
} from "@nebutra/billing";

// Check entitlement
const result = checkEntitlement("org_xxx", "ai.chat");
if (result.allowed) {
  // Feature is available
}

// Require entitlement (throws if not allowed)
try {
  requireEntitlement("org_xxx", "web3.contracts");
} catch (error) {
  // Handle EntitlementError
}

// Initialize entitlements for new organization
await initializePlanEntitlements("org_xxx", "PRO");
```

## Plans

| Plan       | Monthly | Yearly | AI Tokens | API Calls  | Features    |
| ---------- | ------- | ------ | --------- | ---------- | ----------- |
| FREE       | $0      | $0     | 1,000     | 100/day    | Basic       |
| PRO        | $29     | $279   | 100,000   | 10,000/day | Full access |
| ENTERPRISE | Custom  | Custom | Unlimited | Unlimited  | Custom SLA  |

## Feature Flags

Features are organized by category:

```typescript
const FEATURES = {
  // AI Features
  "ai.chat": { name: "AI Chat", plans: ["FREE", "PRO", "ENTERPRISE"] },
  "ai.embeddings": { name: "Embeddings", plans: ["PRO", "ENTERPRISE"] },
  "ai.image": { name: "Image Generation", plans: ["PRO", "ENTERPRISE"] },

  // Content Features
  "content.posts": { name: "Posts", plans: ["FREE", "PRO", "ENTERPRISE"] },
  "content.comments": {
    name: "Comments",
    plans: ["FREE", "PRO", "ENTERPRISE"],
  },

  // Recommendations
  "recsys.basic": {
    name: "Basic Recommendations",
    plans: ["PRO", "ENTERPRISE"],
  },
  "recsys.advanced": {
    name: "Advanced Recommendations",
    plans: ["ENTERPRISE"],
  },

  // E-commerce
  "ecommerce.basic": { name: "Basic E-commerce", plans: ["PRO", "ENTERPRISE"] },
  "ecommerce.advanced": { name: "Advanced E-commerce", plans: ["ENTERPRISE"] },

  // Web3
  "web3.contracts": { name: "Smart Contracts", plans: ["ENTERPRISE"] },
  "web3.indexing": { name: "Blockchain Indexing", plans: ["ENTERPRISE"] },
};
```

## Webhook Events

Creem (current card rail, `POST /api/webhooks/creem`):

- `checkout.completed` - Settles a payment order (one-time card purchase)
- `subscription.*` - Reserved for when subscriptions move to Creem

Stripe (legacy, `POST /api/webhooks/stripe` — only feeds surfaces that have
not yet moved to Creem):

- `checkout.session.completed` - New subscription
- `customer.subscription.updated` - Plan changes
- `customer.subscription.deleted` - Cancellations
- `invoice.paid` - Successful payments
- `invoice.payment_failed` - Failed payments
- `payment_intent.succeeded` - Legacy credit purchases

## Database Schema

See `packages/platform/db/prisma/schema.prisma` for billing-related models:

- `PricingPlan` - Plan definitions
- `Subscription` - Active subscriptions
- `Invoice` / `InvoiceItem` - Invoice records
- `Payment` / `PaymentMethod` - Payment tracking
- `UsageRecord` / `UsageAggregate` - Usage metering
- `CreditBalance` / `CreditTransaction` - Credits system
- `Entitlement` - Feature access
- `StripeCustomer` - Stripe integration
- `WebhookEvent` - Webhook logging

## Python Microservice

A companion Python microservice is available at `backends/python/billing/` for:

- REST API endpoints
- Webhook processing
- Background jobs
- Usage aggregation

```bash
cd backends/python/billing
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8005
```

## License

Private - Nebutra SaaS Platform
