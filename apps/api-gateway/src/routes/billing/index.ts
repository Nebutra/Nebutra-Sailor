/**
 * /api/v1/billing — Billing & subscription routes
 *
 * Thin proxy layer that delegates to @nebutra/billing package functions.
 * Auth + tenant context applied upstream.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  checkUsageLimit,
  createBillingPortalSession,
  createCheckoutSession,
  getStripeSubscription,
} from "@nebutra/billing";
import { toApiError } from "@nebutra/errors";
import { getUsageSnapshot } from "../../middlewares/usageMetering.js";
import { billingServiceBreaker, CircuitOpenError } from "../../services/circuitBreaker.js";

export const billingRoutes = new OpenAPIHono();

// ── Schemas ───────────────────────────────────────────────────────────────────

const CheckoutRequestSchema = z.object({
  priceId: z.string().startsWith("price_"),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  trialPeriodDays: z.number().int().min(0).max(30).optional(),
});

const PortalRequestSchema = z.object({
  returnUrl: z.string().url(),
});

const UsageResponseSchema = z.object({
  period: z.string(),
  apiCalls: z.object({
    used: z.number(),
    limit: z.number(),
    percentUsed: z.number(),
  }),
  aiTokens: z.object({
    used: z.number(),
  }),
});

// ── Routes ────────────────────────────────────────────────────────────────────

const checkoutRoute = createRoute({
  method: "post",
  path: "/checkout",
  tags: ["Billing"],
  summary: "Create Stripe Checkout session",
  request: { body: { content: { "application/json": { schema: CheckoutRequestSchema } } } },
  responses: {
    200: { description: "Checkout session URL" },
    400: { description: "Invalid request" },
  },
});

billingRoutes.openapi(checkoutRoute, async (c) => {
  const tenant = c.get("tenant");
  const { priceId, successUrl, cancelUrl, trialPeriodDays } = c.req.valid("json");

  try {
    const session = await billingServiceBreaker.call(() =>
      createCheckoutSession({
        customerId: tenant?.organizationId ?? "",
        priceId,
        successUrl,
        cancelUrl,
        ...(trialPeriodDays !== undefined && { trialPeriodDays }),
      }),
    );
    return c.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      return c.json({ error: "Billing service temporarily unavailable" }, 503);
    }
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 400);
  }
});

const portalRoute = createRoute({
  method: "post",
  path: "/portal",
  tags: ["Billing"],
  summary: "Create Stripe Customer Portal session",
  request: { body: { content: { "application/json": { schema: PortalRequestSchema } } } },
  responses: {
    200: { description: "Billing portal URL" },
    400: { description: "Invalid request" },
  },
});

billingRoutes.openapi(portalRoute, async (c) => {
  const tenant = c.get("tenant");
  const { returnUrl } = c.req.valid("json");

  try {
    const session = await billingServiceBreaker.call(() =>
      createBillingPortalSession(tenant?.organizationId ?? "", returnUrl),
    );
    return c.json({ url: session.url });
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      return c.json({ error: "Billing service temporarily unavailable" }, 503);
    }
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 400);
  }
});

const subscriptionRoute = createRoute({
  method: "get",
  path: "/subscription",
  tags: ["Billing"],
  summary: "Get current subscription",
  responses: {
    200: { description: "Subscription details" },
    404: { description: "No active subscription" },
  },
});

billingRoutes.openapi(subscriptionRoute, async (c) => {
  const tenant = c.get("tenant");

  try {
    const sub = await billingServiceBreaker.call(() =>
      getStripeSubscription(tenant?.organizationId ?? ""),
    );
    if (!sub) return c.json({ error: "No active subscription" }, 404);
    return c.json(sub);
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      return c.json({ error: "Billing service temporarily unavailable" }, 503);
    }
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 400);
  }
});

const usageRoute = createRoute({
  method: "get",
  path: "/usage",
  tags: ["Billing"],
  summary: "Get current usage and limits",
  responses: {
    200: {
      description: "Usage data",
      content: { "application/json": { schema: UsageResponseSchema } },
    },
    500: { description: "Internal Server Error" },
  },
});

billingRoutes.openapi(usageRoute, async (c) => {
  const tenant = c.get("tenant");
  const orgId = tenant?.organizationId ?? "";

  try {
    const snapshot = await getUsageSnapshot(orgId);
    // Use the synchronous checkUsageLimit with a default limit of 10000
    const limitResult = checkUsageLimit(BigInt(snapshot.apiCalls), BigInt(10000), BigInt(0));

    return c.json({
      period: snapshot.period,
      apiCalls: {
        used: snapshot.apiCalls,
        limit: Number(limitResult.limit),
        percentUsed: limitResult.percentUsed,
      },
      aiTokens: {
        used: snapshot.aiTokens,
      },
    });
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 500);
  }
});
