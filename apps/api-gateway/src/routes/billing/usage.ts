/**
 * /api/v1/billing/usage — UsageLedger write endpoint.
 *
 * Thin route that writes (claims) a UsageLedgerEntry row using the atomic
 * idempotency primitive on UsageLedgerRepository. The (organizationId,
 * idempotencyKey) unique constraint on the ledger table is the sole source of
 * truth for "have I already seen this write?" — we do not rely on in-memory
 * dedup.
 *
 * Contract:
 *   - 201 Created  → new row written
 *   - 200 OK       → duplicate key, returning first-write payload
 *   - 400 Bad Req  → body missing/invalid idempotencyKey
 *
 * See docs/architecture/2026-04-18-event-flow.md.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getTenantDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { UsageLedgerRepository } from "@nebutra/repositories";
import { requireAuth, requireOrganization } from "../../middlewares/tenantContext.js";

export const usageLedgerRoutes = new OpenAPIHono();

// Auth + org guards run on every request into this sub-app.
usageLedgerRoutes.use("*", requireAuth, requireOrganization);

// ── Schemas ───────────────────────────────────────────────────────────────────

const UsageRequestSchema = z.object({
  amount: z.number().positive(),
  idempotencyKey: z.string().min(1),
  type: z
    .enum(["API_CALL", "AI_TOKEN", "STORAGE", "COMPUTE", "BANDWIDTH", "CUSTOM"])
    .default("API_CALL"),
  unit: z.string().min(1).default("unit"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const UsageResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  idempotencyKey: z.string(),
  amount: z.number(),
  duplicate: z.boolean(),
});

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

const usageRoute = createRoute({
  method: "post",
  path: "/usage",
  tags: ["Billing", "Usage"],
  summary: "Append an entry to the usage ledger (idempotent)",
  description:
    "Writes a single row to UsageLedgerEntry. The idempotencyKey is mandatory: replaying the same key for the same tenant returns the first-write record untouched with duplicate=true and a 200 status.",
  request: {
    body: {
      content: { "application/json": { schema: UsageRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Duplicate — returning first-write record",
      content: { "application/json": { schema: UsageResponseSchema } },
    },
    201: {
      description: "Ledger row created",
      content: { "application/json": { schema: UsageResponseSchema } },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: ErrorSchema } },
    },
    401: { description: "Unauthorized" },
    403: { description: "Organization membership required" },
    500: {
      description: "Internal error",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

usageLedgerRoutes.openapi(usageRoute, async (c) => {
  const tenant = c.get("tenant");
  const organizationId = tenant.organizationId as string;
  const body = c.req.valid("json");

  try {
    const repo = new UsageLedgerRepository(getTenantDb(organizationId));

    const result = await repo.claim({
      organizationId,
      idempotencyKey: body.idempotencyKey,
      type: body.type,
      quantity: Math.trunc(body.amount),
      unit: body.unit,
      ...(body.metadata !== undefined && { metadata: body.metadata }),
    });

    const payload = {
      id: result.entry.id,
      organizationId: result.entry.organizationId,
      idempotencyKey: result.entry.idempotencyKey,
      amount: Number(result.entry.quantity),
      duplicate: !result.claimed,
    };

    if (result.claimed) {
      logger.info("usage ledger row claimed", {
        organizationId,
        idempotencyKey: body.idempotencyKey,
        entryId: result.entry.id,
      });
      return c.json(payload, 201);
    }

    logger.info("usage ledger duplicate replay", {
      organizationId,
      idempotencyKey: body.idempotencyKey,
      entryId: result.entry.id,
    });
    return c.json(payload, 200);
  } catch (err) {
    logger.error("usage ledger write failed", err, { organizationId });
    return c.json(
      {
        error: "InternalServerError",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      500,
    );
  }
});
