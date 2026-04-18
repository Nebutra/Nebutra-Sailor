import { logger } from "@nebutra/logger";
import { getPolar } from "./client";

export interface CreatePolarCheckoutInput {
  productId: string;
  successUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

/**
 * Create a Polar checkout session
 */
export async function createPolarCheckout(options: CreatePolarCheckoutInput) {
  const polar = getPolar();

  try {
    return await polar.checkouts.create({
      products: [options.productId],
      successUrl: options.successUrl,
      customerEmail: options.customerEmail,
      metadata: options.metadata,
    });
  } catch (error) {
    logger.error("Failed to create Polar checkout session", { error });
    throw new Error("Failed to create Polar checkout session");
  }
}

/**
 * Get a Polar subscription by ID
 */
export async function getPolarSubscription(subscriptionId: string) {
  const polar = getPolar();

  try {
    return await polar.subscriptions.get({ id: subscriptionId });
  } catch (error) {
    logger.error("Failed to get Polar subscription", {
      subscriptionId,
      error,
    });
    throw new Error(`Failed to get Polar subscription: ${subscriptionId}`);
  }
}

/**
 * Cancel (revoke) a Polar subscription
 */
export async function cancelPolarSubscription(subscriptionId: string) {
  const polar = getPolar();

  try {
    return await polar.subscriptions.revoke({ id: subscriptionId });
  } catch (error) {
    logger.error("Failed to cancel Polar subscription", {
      subscriptionId,
      error,
    });
    throw new Error(`Failed to cancel Polar subscription: ${subscriptionId}`);
  }
}

/**
 * List available Polar products
 */
export async function listPolarProducts() {
  const polar = getPolar();

  try {
    const pages = await polar.products.list({});
    const products = [];

    for await (const page of pages) {
      products.push(...page.result.items);
    }

    return products;
  } catch (error) {
    logger.error("Failed to list Polar products", { error });
    throw new Error("Failed to list Polar products");
  }
}
