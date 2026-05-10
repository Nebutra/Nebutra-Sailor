import {
  type ListSubscriptions,
  listSubscriptions as lsListSubscriptions,
  updateSubscription as lsUpdateSubscription,
  type Subscription,
  type UpdateSubscription,
} from "@lemonsqueezy/lemonsqueezy.js";
import { logger } from "@nebutra/logger";
import type { SubscriptionStatus } from "../types";
import { getLemonSqueezyConfig } from "./client";

// =============================================================================
// LemonSqueezy Subscription Management
// =============================================================================

/**
 * Map LemonSqueezy subscription status to the local SubscriptionStatus type.
 */
export function mapLemonStatusToLocal(lemonStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    on_trial: "TRIALING",
    active: "ACTIVE",
    paused: "PAUSED",
    pause: "PAUSED",
    past_due: "PAST_DUE",
    unpaid: "UNPAID",
    cancelled: "CANCELED",
    expired: "CANCELED",
  };

  return statusMap[lemonStatus] ?? "INCOMPLETE";
}

export interface UpdateLemonSubscriptionInput {
  variantId?: number;
  cancelled?: boolean;
  pause?: { mode: "void" | "free"; resumesAt?: string | null } | null;
  trialEndsAt?: string | null;
  billingAnchor?: number | null;
  invoiceImmediately?: boolean;
  disableProrations?: boolean;
}

/**
 * Update a LemonSqueezy subscription (change variant, cancel, etc.)
 */
export async function updateLemonSubscription(
  subscriptionId: string | number,
  updates: UpdateLemonSubscriptionInput,
): Promise<Subscription> {
  getLemonSqueezyConfig(); // ensure initialized

  const updateData: UpdateSubscription = {};
  if (updates.variantId !== undefined) updateData.variantId = updates.variantId;
  if (updates.cancelled !== undefined) updateData.cancelled = updates.cancelled;
  if (updates.pause !== undefined) updateData.pause = updates.pause;
  if (updates.trialEndsAt !== undefined) updateData.trialEndsAt = updates.trialEndsAt;
  if (updates.billingAnchor !== undefined) updateData.billingAnchor = updates.billingAnchor;
  if (updates.invoiceImmediately !== undefined)
    updateData.invoiceImmediately = updates.invoiceImmediately;
  if (updates.disableProrations !== undefined)
    updateData.disableProrations = updates.disableProrations;

  const response = await lsUpdateSubscription(subscriptionId, updateData);

  if (response.error) {
    logger.error("Failed to update LemonSqueezy subscription", {
      error: response.error.message,
      subscriptionId: String(subscriptionId),
    });
    throw new Error(`Failed to update LemonSqueezy subscription: ${response.error.message}`);
  }

  if (!response.data) {
    throw new Error(`LemonSqueezy subscription not found: ${subscriptionId}`);
  }

  return response.data;
}

/**
 * Pause a LemonSqueezy subscription.
 *
 * @param subscriptionId - The subscription ID
 * @param options - Optional pause mode and resume date
 * @returns The updated subscription
 */
export async function pauseLemonSubscription(
  subscriptionId: string | number,
  options?: { mode?: "void" | "free"; resumesAt?: string | null },
): Promise<Subscription> {
  return updateLemonSubscription(subscriptionId, {
    pause: {
      mode: options?.mode ?? "void",
      ...(options?.resumesAt ? { resumesAt: options.resumesAt } : {}),
    },
  });
}

/**
 * Resume (unpause + un-cancel) a LemonSqueezy subscription.
 *
 * @param subscriptionId - The subscription ID
 * @returns The updated subscription
 */
export async function resumeLemonSubscription(
  subscriptionId: string | number,
): Promise<Subscription> {
  return updateLemonSubscription(subscriptionId, {
    cancelled: false,
    pause: null,
  });
}

export interface ListLemonSubscriptionsFilter {
  storeId?: string | number;
  orderId?: string | number;
  orderItemId?: string | number;
  productId?: string | number;
  variantId?: string | number;
  userEmail?: string;
  status?: string;
}

/**
 * List LemonSqueezy subscriptions with optional filters.
 */
export async function listLemonSubscriptions(
  filter: ListLemonSubscriptionsFilter,
): Promise<ListSubscriptions["data"]> {
  getLemonSqueezyConfig(); // ensure initialized

  // LemonSqueezy SDK expects a narrower SubscriptionStatus enum on `filter.status`.
  // Our filter type accepts `string` for ergonomic use; cast to satisfy the SDK
  // signature without imposing the SDK's enum on our public API.
  // biome-ignore lint/suspicious/noExplicitAny: SDK type uses a narrower enum than our public filter type
  const response = await lsListSubscriptions({ filter: filter as any });

  if (response.error) {
    logger.error("Failed to list LemonSqueezy subscriptions", {
      error: response.error.message,
    });
    throw new Error(`Failed to list LemonSqueezy subscriptions: ${response.error.message}`);
  }

  if (!response.data) {
    return [] as unknown as ListSubscriptions["data"];
  }

  return response.data.data;
}
