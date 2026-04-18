import type Stripe from "stripe";
import { getStripe } from "../stripe/client";
import type { SubscriptionStatus } from "../types";
import { SubscriptionError } from "../types";

// ============================================
// Types
// ============================================

export interface SubscriptionDetails {
  id: string;
  stripeId: string;
  organizationId: string;
  status: SubscriptionStatus;
  planId: string;
  planName: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
}

export interface CreateStripeSubscriptionInput {
  customerId: string;
  priceId: string;
  organizationId: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

// ============================================
// Stripe Subscription Operations
// ============================================

/**
 * Create a subscription in Stripe
 */
export async function createStripeSubscription(
  input: CreateStripeSubscriptionInput,
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  const subscriptionData: Stripe.SubscriptionCreateParams = {
    customer: input.customerId,
    items: [{ price: input.priceId }],
    metadata: {
      organizationId: input.organizationId,
      ...input.metadata,
    },
    expand: ["latest_invoice.payment_intent"],
  };

  if (input.trialDays && input.trialDays > 0) {
    subscriptionData.trial_period_days = input.trialDays;
  }

  return stripe.subscriptions.create(subscriptionData);
}

/**
 * Get a subscription from Stripe
 */
export async function getStripeSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription | null> {
  const stripe = getStripe();

  try {
    return await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["customer", "items.data.price.product"],
    });
  } catch {
    return null;
  }
}

/**
 * Update a subscription in Stripe
 */
export async function updateStripeSubscription(
  subscriptionId: string,
  updates: {
    priceId?: string;
    cancelAtPeriodEnd?: boolean;
    metadata?: Record<string, string>;
  },
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  const updateParams: Stripe.SubscriptionUpdateParams = {};

  if (updates.priceId) {
    // Get the subscription to find the item to update
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const itemId = subscription.items.data[0]?.id;

    if (!itemId) {
      throw new SubscriptionError("No subscription items found", "NO_SUBSCRIPTION_ITEMS");
    }

    updateParams.items = [
      {
        id: itemId,
        price: updates.priceId,
      },
    ];
    updateParams.proration_behavior = "create_prorations";
  }

  if (updates.cancelAtPeriodEnd !== undefined) {
    updateParams.cancel_at_period_end = updates.cancelAtPeriodEnd;
  }

  if (updates.metadata) {
    updateParams.metadata = updates.metadata;
  }

  return stripe.subscriptions.update(subscriptionId, updateParams);
}

/**
 * Cancel a subscription in Stripe
 */
export async function cancelStripeSubscription(
  subscriptionId: string,
  immediately: boolean = false,
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }

  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Resume a canceled subscription
 */
export async function resumeStripeSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Pause a subscription
 */
export async function pauseStripeSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  return stripe.subscriptions.update(subscriptionId, {
    pause_collection: {
      behavior: "void",
    },
  });
}

/**
 * Resume a paused subscription
 */
export async function unpauseStripeSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  return stripe.subscriptions.update(subscriptionId, {
    pause_collection: "",
  });
}

/**
 * Get all subscriptions for a customer
 */
export async function getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
  const stripe = getStripe();

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    expand: ["data.items.data.price.product"],
  });

  return subscriptions.data;
}

// ============================================
// Status Mapping
// ============================================

export function mapStripeStatusToLocal(
  stripeStatus: Stripe.Subscription.Status,
): SubscriptionStatus {
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "UNPAID",
    trialing: "TRIALING",
    paused: "PAUSED",
    incomplete: "INCOMPLETE",
    incomplete_expired: "CANCELED",
  };

  return statusMap[stripeStatus] || "INCOMPLETE";
}

/**
 * Preview upcoming invoice for a subscription change
 */
export async function previewSubscriptionChange(
  subscriptionId: string,
  newPriceId: string,
): Promise<Stripe.UpcomingInvoice> {
  const stripe = getStripe();

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0]?.id;

  if (!itemId) {
    throw new SubscriptionError("No subscription items found", "NO_SUBSCRIPTION_ITEMS");
  }

  return stripe.invoices.createPreview({
    subscription: subscriptionId,
    subscription_details: {
      items: [
        {
          id: itemId,
          price: newPriceId,
        },
      ],
    },
  });
}
