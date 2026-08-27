/**
 * /api/v1/billing — Billing & subscription routes
 *
 * Thin proxy layer that delegates to @nebutra/billing package functions.
 * Auth + tenant context applied upstream.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  assertProductReturnUrl,
  BillingError,
  checkUsageLimit,
  createBillingPortalSession,
  createCheckoutSession,
  DEFAULT_PLAN_LIMITS,
  getStripeSubscription,
  parseCheckoutSelection,
  resolveBillingProviderReadiness,
  resolveCheckoutOffer,
  resolveCheckoutReturnUrls,
} from "@nebutra/billing";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { getSystemDb } from "@nebutra/db";
import { toApiError } from "@nebutra/errors";
import type { Context, Next } from "hono";
import {
  mapTenantRoleToPermissionRoles,
  requireAuth,
  requireOrganization,
} from "../../middlewares/tenantContext.js";
import { getUsageSnapshot } from "../../middlewares/usageMetering.js";
import { billingServiceBreaker, CircuitOpenError } from "../../services/circuitBreaker.js";

export const billingRoutes = new OpenAPIHono();
billingRoutes.use("*", requireAuth, requireOrganization);
billingRoutes.use("/checkout", requireBillingManage);
billingRoutes.use("/portal", requireBillingManage);

const BILLING_MANAGE_ROLES = new Set(["owner", "admin", "billing_admin"]);

async function requireBillingManage(c: Context, next: Next) {
  const tenant = c.get("tenant");
  const roles = mapTenantRoleToPermissionRoles(tenant?.role);
  if (!roles.some((role) => BILLING_MANAGE_ROLES.has(role))) {
    return c.json({ error: "Forbidden", message: "billing:manage permission is required" }, 403);
  }
  await next();
}

function checkoutEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    APP_URL: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? getBrandOrigin("app"),
  };
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const CheckoutRequestSchema = z.object({
  plan: z.enum(["pro", "enterprise", "plan_pro", "plan_enterprise"]),
  interval: z.enum(["monthly", "yearly", "month", "year"]),
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

const ProviderStatusResponseSchema = z.object({
  provider: z.string(),
  status: z.enum(["disabled", "degraded", "ready"]),
  checkoutReady: z.boolean(),
  portalReady: z.boolean(),
  missing: z.array(z.string()),
  title: z.string(),
  description: z.string(),
});

function resolveGatewayBillingProviderReadiness() {
  const selfServiceEnabled =
    process.env.FEATURE_FLAG_BILLING !== "false" &&
    process.env.NEBUTRA_BILLING_CHECKOUT_MODE !== "none";

  return resolveBillingProviderReadiness({
    selfServiceEnabled,
    requiredPriceEnvVars: ["STRIPE_PRICE_ID_PRO_MONTHLY", "STRIPE_PRICE_ID_PRO_YEARLY"],
  });
}

async function resolveStripeCustomerId(organizationId: string): Promise<string | null> {
  const customer = await getSystemDb().stripeCustomer.findUnique({
    where: { tenantId: organizationId },
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
  const body = c.req.valid("json");
  const organizationId = tenant.organizationId as string;
  const customerId = await resolveStripeCustomerId(organizationId);

  if (!customerId) {
    return c.json({ error: "Stripe customer mapping is missing for this organization." }, 424);
  }

  try {
    const env = checkoutEnv();
    const offer = resolveCheckoutOffer(parseCheckoutSelection(body), env);
    const urls = resolveCheckoutReturnUrls(env);
    const session = await billingServiceBreaker.call(() =>
      createCheckoutSession({
        customerId,
        priceId: offer.priceId,
        successUrl: urls.successUrl,
        cancelUrl: urls.cancelUrl,
        metadata: { organizationId, plan: offer.plan, interval: offer.interval },
        quantity: offer.quantity,
        ...(offer.trialPeriodDays !== undefined && { trialPeriodDays: offer.trialPeriodDays }),
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
    if (err instanceof BillingError) {
      return c.json({ error: err.message }, err.statusCode === 503 ? 503 : 400);
    }
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 400);
  }
});

const providerStatusRoute = createRoute({
  method: "get",
  path: "/provider-status",
  tags: ["Billing"],
  summary: "Get billing provider readiness",
  responses: {
    200: {
      description: "Billing provider readiness",
      content: { "application/json": { schema: ProviderStatusResponseSchema } },
    },
    403: {
      description: "Organization membership required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

billingRoutes.openapi(providerStatusRoute, (c) => {
  return c.json(resolveGatewayBillingProviderReadiness(), 200);
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
    const safeReturnUrl = assertProductReturnUrl(returnUrl, checkoutEnv());
    const session = await billingServiceBreaker.call(() =>
      createBillingPortalSession(customerId, safeReturnUrl),
    );
    return c.json({ url: session.url }, 200);
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      return c.json({ error: "Billing service temporarily unavailable" }, 503);
    }
    if (err instanceof BillingError) {
      return c.json({ error: err.message }, 400);
    }
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 400);
  }
});

const SubscriptionResponseSchema = z
  .object({
    id: z.string().optional(),
    status: z.string().optional(),
    customer: z.unknown().optional(),
    items: z.unknown().optional(),
    current_period_end: z.number().optional(),
    cancel_at_period_end: z.boolean().optional(),
  })
  .passthrough();

const subscriptionRoute = createRoute({
  method: "get",
  path: "/subscription",
  tags: ["Billing"],
  summary: "Get current subscription",
  responses: {
    200: {
      description: "Subscription details",
      content: { "application/json": { schema: SubscriptionResponseSchema } },
    },
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
