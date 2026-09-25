/**
 * /api/v1/billing/credits — credit balance & history
 *
 * Buying credits is an ordinary payment order for a credits offer — see
 * ./orders.ts. This file only reads the ledger.
 *
 * Auth + tenant context applied upstream via `tenantContextMiddleware`.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  creditsToDollars,
  dollarsToCredits,
  formatCredits,
  getCreditBalance,
  getCreditTransactions,
} from "@nebutra/billing";
import { toApiError } from "@nebutra/errors";
import { logger } from "@nebutra/logger";
import { requireAuth, requireOrganization } from "../../middlewares/tenantContext.js";

export const creditsRoutes = new OpenAPIHono();

// ── Schemas ───────────────────────────────────────────────────────────────────

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

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Authenticated routes — require org membership
creditsRoutes.use("/balance", requireAuth, requireOrganization);
creditsRoutes.use("/transactions", requireAuth, requireOrganization);

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
