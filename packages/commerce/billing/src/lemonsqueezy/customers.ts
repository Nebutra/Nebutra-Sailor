import {
  type Checkout,
  cancelSubscription as lsCancelSubscription,
  createCheckout as lsCreateCheckout,
  getCustomer as lsGetCustomer,
  getSubscription as lsGetSubscription,
  type NewCheckout,
  type Subscription,
} from "@lemonsqueezy/lemonsqueezy.js";
import { logger } from "@nebutra/logger";
import { getLemonSqueezyConfig } from "./client";

export interface CreateLemonCheckoutOptions {
  variantId: string | number;
  email?: string;
  name?: string;
  customData?: Record<string, unknown>;
  redirectUrl?: string;
  discountCode?: string;
  testMode?: boolean;
}

/**
 * Create a LemonSqueezy checkout URL
 */
export async function createLemonCheckout(
  options: CreateLemonCheckoutOptions,
): Promise<{ checkoutUrl: string; checkout: Checkout }> {
  const { storeId } = getLemonSqueezyConfig();

  const checkoutData: NewCheckout = {
    checkoutData: {
      email: options.email,
      name: options.name,
      custom: options.customData,
      discountCode: options.discountCode,
    },
    productOptions: {
      redirectUrl: options.redirectUrl,
    },
    testMode: options.testMode,
  };

  const response = await lsCreateCheckout(storeId, options.variantId, checkoutData);

  if (response.error) {
    logger.error("Failed to create LemonSqueezy checkout", {
      error: response.error.message,
      variantId: options.variantId,
    });
    throw new Error(`Failed to create LemonSqueezy checkout: ${response.error.message}`);
  }

  const checkout = response.data;
  const checkoutUrl = checkout?.data?.attributes?.url;
  if (!checkoutUrl) {
    throw new Error("LemonSqueezy checkout created but no URL returned");
  }

  return { checkoutUrl, checkout };
}

/**
 * Retrieve a LemonSqueezy subscription by ID
 */
export async function getLemonSubscription(subscriptionId: string | number): Promise<Subscription> {
  getLemonSqueezyConfig(); // ensure initialized

  const response = await lsGetSubscription(subscriptionId);

  if (response.error) {
    logger.error("Failed to retrieve LemonSqueezy subscription", {
      error: response.error.message,
      subscriptionId: String(subscriptionId),
    });
    throw new Error(`Failed to retrieve LemonSqueezy subscription: ${response.error.message}`);
  }

  if (!response.data) {
    throw new Error(`LemonSqueezy subscription not found: ${subscriptionId}`);
  }

  return response.data;
}

/**
 * Cancel a LemonSqueezy subscription
 */
export async function cancelLemonSubscription(
  subscriptionId: string | number,
): Promise<Subscription> {
  getLemonSqueezyConfig(); // ensure initialized

  const response = await lsCancelSubscription(subscriptionId);

  if (response.error) {
    logger.error("Failed to cancel LemonSqueezy subscription", {
      error: response.error.message,
      subscriptionId: String(subscriptionId),
    });
    throw new Error(`Failed to cancel LemonSqueezy subscription: ${response.error.message}`);
  }

  if (!response.data) {
    throw new Error(`LemonSqueezy subscription not found: ${subscriptionId}`);
  }

  return response.data;
}

/**
 * Get the customer portal URL for a LemonSqueezy customer.
 * The URL is valid for 24 hours from the time of the request.
 */
export async function getLemonCustomerPortalUrl(customerId: string | number): Promise<string> {
  getLemonSqueezyConfig(); // ensure initialized

  const response = await lsGetCustomer(customerId);

  if (response.error) {
    logger.error("Failed to retrieve LemonSqueezy customer", {
      error: response.error.message,
      customerId: String(customerId),
    });
    throw new Error(`Failed to retrieve LemonSqueezy customer: ${response.error.message}`);
  }

  const portalUrl = response.data?.data?.attributes?.urls?.customer_portal;
  if (!portalUrl) {
    throw new Error(
      `Customer portal URL not available for customer ${customerId}. The customer may not have an active subscription.`,
    );
  }

  return portalUrl;
}
