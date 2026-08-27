import Stripe from "stripe";

let stripeClient: Stripe | null = null;

// Use the latest Stripe API version
const STRIPE_API_VERSION = "2026-02-25.clover" as const;

export interface StripeConfig {
  secretKey: string;
  webhookSecret?: string;
}

/**
 * Initialize the Stripe client
 */
export function initStripe(config: StripeConfig): Stripe {
  stripeClient = new Stripe(config.secretKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  });
  return stripeClient;
}

/**
 * Get the Stripe client instance
 */
export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Stripe not initialized. Call initStripe() or set STRIPE_SECRET_KEY");
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
  }
  return stripeClient;
}

/**
 * Get the webhook secret
 */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not set");
  }
  return secret;
}

// Re-export Stripe types
export type { Stripe };
export default getStripe;
