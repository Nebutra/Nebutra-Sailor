# @nebutra/billing

Comprehensive billing and monetization infrastructure for Nebutra SaaS platform.

## Features

- **Stripe Integration** - Subscriptions, payments, customers, checkout sessions
- **Usage Tracking** - Metering, limits, overage pricing
- **Credits System** - Balance management, transactions, purchases
- **Entitlements** - Feature flags, plan-based access control
- **Webhook Handling** - Automated subscription lifecycle management

## Installation

```bash
pnpm add @nebutra/billing
```

## Quick Start

```typescript
import {
  initStripe,
  createCheckoutSession,
  recordUsage,
  checkEntitlement,
} from "@nebutra/billing";

// Initialize Stripe
initStripe({ secretKey: process.env.STRIPE_SECRET_KEY! });

// Create checkout session
const session = await createCheckoutSession({
  customerId: "cus_xxx",
  priceId: "price_xxx",
  successUrl: "https://app.example.com/success",
  cancelUrl: "https://app.example.com/cancel",
});

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
# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price IDs (create in Stripe Dashboard)
STRIPE_PRICE_ID_PRO_MONTHLY=price_xxx
STRIPE_PRICE_ID_PRO_YEARLY=price_xxx
STRIPE_PRICE_ID_ENTERPRISE_MONTHLY=price_xxx
STRIPE_PRICE_ID_ENTERPRISE_YEARLY=price_xxx
```

## Modules

### Stripe (`@nebutra/billing/stripe`)

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

// Checkout session
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

// Check balance
const balance = getCreditBalance("org_xxx");
console.log(`Balance: ${balance} credits ($${creditsToDollars(balance)})`);

// Add credits
await addCredits({
  organizationId: "org_xxx",
  amount: 1000,
  type: "PURCHASE",
  description: "Credit purchase",
});

// Deduct credits
if (hasEnoughCredits("org_xxx", 100)) {
  await deductCredits({
    organizationId: "org_xxx",
    amount: 100,
    type: "USAGE",
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

The billing system handles these Stripe webhook events:

- `checkout.session.completed` - New subscription
- `customer.subscription.updated` - Plan changes
- `customer.subscription.deleted` - Cancellations
- `invoice.paid` - Successful payments
- `invoice.payment_failed` - Failed payments
- `payment_intent.succeeded` - Credit purchases

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
