/**
 * /api/v1/billing/credits — Credit purchase, balance & history routes
 *
 * Provider-agnostic credit purchase flow backed by @nebutra/billing.
 * The checkout provider (Stripe / Polar / LemonSqueezy / ChinaPay / Manual)
 * is auto-detected from environment variables via `getCheckout()`.
 *
 * Auth + tenant context applied upstream via `tenantContextMiddleware`.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  creditsToDollars,
  detectProvider,
  dollarsToCredits,
  formatCredits,
  getCheckout,
  getCreditBalance,
  getCreditTransactions,
} from "@nebutra/billing";
import { toApiError } from "@nebutra/errors";
import { logger } from "@nebutra/logger";
import { requireAuth, requireOrganization } from "../../middlewares/tenantContext.js";
import { billingServiceBreaker, CircuitOpenError } from "../../services/circuitBreaker.js";

export const creditsRoutes = new OpenAPIHono();

// ── Schemas ───────────────────────────────────────────────────────────────────

const CheckoutRequestSchema = z.object({
  creditAmount: z.number().int().positive(),
  amount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  priceId: z.string().optional(),
});

const CheckoutResponseSchema = z.object({
  url: z.string().url(),
  sessionId: z.string(),
  provider: z.string(),
});

const BalanceResponseSchema = z.object({
  balance: z.number(),
  currency: z.string(),
  formatted: z.string(),
});

const TransactionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  type: z.string(),
  amount: z.number(),
  balanceAfter: z.number(),
  description: z.string().optional(),
  expiresAt: z.string().optional(),
  relatedId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string(),
});

const TransactionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  cursor: z.string().optional(),
});

const TransactionsResponseSchema = z.object({
  data: z.array(TransactionSchema),
  meta: z.object({
    total: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().optional(),
  }),
});

const PricingPackSchema = z.object({
  credits: z.number().int().positive(),
  price: z.number().positive(),
  bonus: z.number().int().nonnegative().optional(),
  recommended: z.boolean().optional(),
});

const PricingResponseSchema = z.object({
  packs: z.array(PricingPackSchema),
});

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

// ── Static Pricing Tiers ──────────────────────────────────────────────────────

/**
 * Suggested credit packs for marketing display.
 * 1 credit = $0.01 (so $10 = 1,000 credits at base rate, but we show bonus tiers).
 *
 * Per spec:
 *   $10  → 10,000 credits (baseline x10 multiplier for display)
 *   $50  → 55,000 credits (10% bonus)
 *   $200 → 250,000 credits (25% bonus)
 */
const CREDIT_PACKS = [
  { credits: 10_000, price: 10 },
  { credits: 55_000, price: 50, bonus: 5_000, recommended: true },
  { credits: 250_000, price: 200, bonus: 50_000 },
] as const;

// ── Routes ────────────────────────────────────────────────────────────────────

// Public: /pricing — no auth required
const pricingRoute = createRoute({
  method: "get",
  path: "/pricing",
  tags: ["Billing", "Credits"],
  summary: "List suggested credit pack tiers",
  description: "Public endpoint for marketing display — no authentication required.",
  responses: {
    200: {
      description: "Credit pack pricing",
      content: { "application/json": { schema: PricingResponseSchema } },
    },
  },
});

creditsRoutes.openapi(pricingRoute, (c) => {
  return c.json({ packs: [...CREDIT_PACKS] });
});

// Authenticated routes — require org membership
creditsRoutes.use("/checkout", requireAuth, requireOrganization);
creditsRoutes.use("/balance", requireAuth, requireOrganization);
creditsRoutes.use("/transactions", requireAuth, requireOrganization);

const checkoutRoute = createRoute({
  method: "post",
  path: "/checkout",
  tags: ["Billing", "Credits"],
  summary: "Create a credit purchase checkout session",
  description:
    "Creates a provider-agnostic checkout session (Stripe / Polar / LemonSqueezy / ChinaPay). Provider is auto-detected from env.",
  request: { body: { content: { "application/json": { schema: CheckoutRequestSchema } } } },
  responses: {
    200: {
      description: "Checkout session created",
      content: { "application/json": { schema: CheckoutResponseSchema } },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: ErrorSchema } },
    },
    401: { description: "Unauthorized" },
    403: { description: "Organization membership required" },
    500: {
      description: "Checkout provider error",
      content: { "application/json": { schema: ErrorSchema } },
    },
    503: {
      description: "Billing service temporarily unavailable",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

creditsRoutes.openapi(checkoutRoute, async (c) => {
  const tenant = c.get("tenant");
  const organizationId = tenant.organizationId!;
  const body = c.req.valid("json");

  try {
    const checkout = await getCheckout();
    const session = await billingServiceBreaker.call(() =>
      checkout.createCreditPurchase({
        organizationId,
        creditAmount: body.creditAmount,
        amount: body.amount,
        currency: body.currency,
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
        ...(body.priceId && { priceId: body.priceId }),
      }),
    );

    logger.info("Credit purchase session created", {
      organizationId,
      provider: session.provider,
      sessionId: session.sessionId,
      creditAmount: body.creditAmount,
      amount: body.amount,
    });

    return c.json({
      url: session.url,
      sessionId: session.sessionId,
      provider: session.provider,
    });
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      logger.warn("Credit checkout circuit open", { organizationId });
      return c.json({ error: "Billing service temporarily unavailable" }, 503);
    }
    logger.error("Credit checkout failed", err, {
      organizationId,
      provider: detectProvider(),
    });
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 500);
  }
});

const balanceRoute = createRoute({
  method: "get",
  path: "/balance",
  tags: ["Billing", "Credits"],
  summary: "Get current credit balance",
  responses: {
    200: {
      description: "Credit balance",
      content: { "application/json": { schema: BalanceResponseSchema } },
    },
    401: { description: "Unauthorized" },
    403: { description: "Organization membership required" },
    500: {
      description: "Internal error",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

creditsRoutes.openapi(balanceRoute, async (c) => {
  const tenant = c.get("tenant");
  const organizationId = tenant.organizationId!;

  try {
    const balance = await getCreditBalance(organizationId);
    return c.json({
      balance: balance.balance,
      currency: balance.currency,
      formatted: formatCredits(balance.balance),
    });
  } catch (err) {
    logger.error("Failed to fetch credit balance", err, { organizationId });
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 500);
  }
});

const transactionsRoute = createRoute({
  method: "get",
  path: "/transactions",
  tags: ["Billing", "Credits"],
  summary: "List credit transactions (paginated)",
  request: { query: TransactionsQuerySchema },
  responses: {
    200: {
      description: "Paginated credit transactions",
      content: { "application/json": { schema: TransactionsResponseSchema } },
    },
    401: { description: "Unauthorized" },
    403: { description: "Organization membership required" },
    500: {
      description: "Internal error",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

creditsRoutes.openapi(transactionsRoute, async (c) => {
  const tenant = c.get("tenant");
  const organizationId = tenant.organizationId!;
  const { limit = 50, cursor } = c.req.valid("query");

  try {
    // Cursor is a base64-encoded offset for simple offset pagination.
    // We fetch `limit + 1` to determine whether there's another page.
    const offset = cursor ? parseCursor(cursor) : 0;
    const fetched = await getCreditTransactions(organizationId, {
      limit: limit + 1,
      offset,
    });

    const hasMore = fetched.length > limit;
    const page = hasMore ? fetched.slice(0, limit) : fetched;

    const data = page.map((tx) => ({
      id: tx.id,
      organizationId: tx.organizationId,
      type: String(tx.type),
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      ...(tx.description !== undefined && { description: tx.description }),
      ...(tx.expiresAt && { expiresAt: tx.expiresAt.toISOString() }),
      ...(tx.relatedId !== undefined && { relatedId: tx.relatedId }),
      ...(tx.metadata !== undefined && { metadata: tx.metadata }),
      createdAt: tx.createdAt.toISOString(),
    }));

    return c.json({
      data,
      meta: {
        total: offset + data.length + (hasMore ? 1 : 0),
        hasMore,
        ...(hasMore && { nextCursor: encodeCursor(offset + limit) }),
      },
    });
  } catch (err) {
    logger.error("Failed to fetch credit transactions", err, { organizationId });
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 500);
  }
});

// ── Cursor helpers ────────────────────────────────────────────────────────────

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

function parseCursor(cursor: string): number {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = Number.parseInt(decoded, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

// Suppress unused-import warnings in case a caller wants these helpers later.
export const _internals = { creditsToDollars, dollarsToCredits };
