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
  DEFAULT_PLAN_LIMITS,
  getStripeSubscription,
} from "@nebutra/billing";
import { getSystemDb } from "@nebutra/db";
import { toApiError } from "@nebutra/errors";
import { requireAuth, requireOrganization } from "../../middlewares/tenantContext.js";
import { getUsageSnapshot } from "../../middlewares/usageMetering.js";
import { billingServiceBreaker, CircuitOpenError } from "../../services/circuitBreaker.js";

export const billingRoutes = new OpenAPIHono();
billingRoutes.use("*", requireAuth, requireOrganization);

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

const ErrorResponseSchema = z.object({
  error: z.string(),
});

const CheckoutResponseSchema = z.object({
  url: z.string().url(),
  sessionId: z.string(),
});

const PortalResponseSchema = z.object({
  url: z.string().url(),
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

async function resolveStripeCustomerId(organizationId: string): Promise<string | null> {
  const customer = await getSystemDb().stripeCustomer.findUnique({
    where: { organizationId },
    select: { stripeId: true },
  });

  return customer?.stripeId ?? null;
}

// ── Routes ────────────────────────────────────────────────────────────────────

const checkoutRoute = createRoute({
  method: "post",
  path: "/checkout",
  tags: ["Billing"],
  summary: "Create Stripe Checkout session",
  request: { body: { content: { "application/json": { schema: CheckoutRequestSchema } } } },
  responses: {
    200: {
      description: "Checkout session URL",
      content: { "application/json": { schema: CheckoutResponseSchema } },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Organization membership required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    424: {
      description: "Stripe customer mapping missing",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    503: {
      description: "Billing service temporarily unavailable",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

billingRoutes.openapi(checkoutRoute, async (c) => {
  const tenant = c.get("tenant");
  const { priceId, successUrl, cancelUrl, trialPeriodDays } = c.req.valid("json");
  const organizationId = tenant.organizationId as string;
  const customerId = await resolveStripeCustomerId(organizationId);

  if (!customerId) {
    return c.json({ error: "Stripe customer mapping is missing for this organization." }, 424);
  }

  try {
    const session = await billingServiceBreaker.call(() =>
      createCheckoutSession({
        customerId,
        priceId,
        successUrl,
        cancelUrl,
        metadata: { organizationId },
        ...(trialPeriodDays !== undefined && { trialPeriodDays }),
      }),
    );
    if (!session.url) {
      return c.json({ error: "Stripe checkout session URL is missing" }, 503);
    }
    return c.json({ url: session.url, sessionId: session.id }, 200);
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
    200: {
      description: "Billing portal URL",
      content: { "application/json": { schema: PortalResponseSchema } },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Organization membership required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    424: {
      description: "Stripe customer mapping missing",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    503: {
      description: "Billing service temporarily unavailable",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

billingRoutes.openapi(portalRoute, async (c) => {
  const tenant = c.get("tenant");
  const { returnUrl } = c.req.valid("json");
  const customerId = await resolveStripeCustomerId(tenant.organizationId as string);

  if (!customerId) {
    return c.json({ error: "Stripe customer mapping is missing for this organization." }, 424);
  }

  try {
    const session = await billingServiceBreaker.call(() =>
      createBillingPortalSession(customerId, returnUrl),
    );
    return c.json({ url: session.url }, 200);
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

    // Extract plan limit dynamically from the tenant scope
    const plan = tenant?.plan === "PRO" || tenant?.plan === "ENTERPRISE" ? tenant.plan : "FREE";
    const planConfig = DEFAULT_PLAN_LIMITS[plan];
    const limitResult = checkUsageLimit(
      BigInt(snapshot.apiCalls),
      BigInt(planConfig.apiCalls || 10000),
      BigInt(0),
    );

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
