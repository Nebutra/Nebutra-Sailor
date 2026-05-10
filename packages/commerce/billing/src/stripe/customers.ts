import type Stripe from "stripe";
import { getStripe } from "./client";

export interface CreateCustomerInput {
  organizationId: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface UpdateCustomerInput {
  customerId: string;
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
}

/**
 * Create a Stripe customer
 */
export async function createCustomer(input: CreateCustomerInput): Promise<Stripe.Customer> {
  const stripe = getStripe();

  return stripe.customers.create({
    email: input.email,
    name: input.name,
    metadata: {
      organizationId: input.organizationId,
      ...input.metadata,
    },
  });
}

/**
 * Get a Stripe customer by ID
 */
export async function getCustomer(customerId: string): Promise<Stripe.Customer | null> {
  const stripe = getStripe();

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }
    return customer as Stripe.Customer;
  } catch {
    return null;
  }
}

/**
 * Update a Stripe customer
 */
export async function updateCustomer(input: UpdateCustomerInput): Promise<Stripe.Customer> {
  const stripe = getStripe();

  return stripe.customers.update(input.customerId, {
    email: input.email,
    name: input.name,
    metadata: input.metadata,
  });
}

/**
 * Delete a Stripe customer
 */
export async function deleteCustomer(customerId: string): Promise<Stripe.DeletedCustomer> {
  const stripe = getStripe();
  return stripe.customers.del(customerId);
}

/**
 * Get or create a Stripe customer for an organization
 */
export async function getOrCreateCustomer(
  organizationId: string,
  email: string,
  name?: string,
): Promise<Stripe.Customer> {
  const stripe = getStripe();

  // Search for existing customer
  const existing = await stripe.customers.search({
    query: `metadata["organizationId"]:"${organizationId}"`,
    limit: 1,
  });

  if (existing.data.length > 0) {
    return existing.data[0] as Stripe.Customer;
  }

  // Create new customer
  return createCustomer({
    organizationId,
    email,
    name,
  });
}

/**
 * Create a billing portal session for a customer
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Create a checkout session for a customer
 */
export async function createCheckoutSession(options: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  mode?: "subscription" | "payment" | "setup";
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();

  return stripe.checkout.sessions.create({
    customer: options.customerId,
    mode: options.mode || "subscription",
    line_items: [
      {
        price: options.priceId,
        quantity: 1,
      },
    ],
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    subscription_data: options.trialPeriodDays
      ? {
          trial_period_days: options.trialPeriodDays,
          metadata: options.metadata,
        }
      : {
          metadata: options.metadata,
        },
    metadata: options.metadata,
  });
}
