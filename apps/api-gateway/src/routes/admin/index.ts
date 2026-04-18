/**
 * /api/v1/admin — Internal platform administration routes
 *
 * All routes require the X-Admin-Key header matching ADMIN_API_KEY env var.
 * These endpoints are NOT exposed through the public ingress — they are
 * accessed only from internal tooling and the ops Slack bot.
 *
 * Routes:
 *   GET  /tenants          — list organizations with usage + plan
 *   GET  /tenants/:id      — single org details
 *   POST /tenants/:id/suspend   — suspend (block all API access)
 *   POST /tenants/:id/unsuspend — restore access
 *   GET  /usage/report     — cross-tenant usage aggregation
 *   GET  /dlq              — dead letter queue entries
 *   POST /dlq/:id/replay   — retry a DLQ entry
 *   GET  /feature-flags    — list all feature flag overrides
 *   POST /feature-flags    — set per-tenant feature flag override
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getSystemDb } from "@nebutra/db";
import { ackDeadLetter, getDeadLetterQueue } from "@nebutra/event-bus";
import { logger } from "@nebutra/logger";
import { env } from "../../config/env.js";
import { getUsageSnapshot } from "../../middlewares/usageMetering.js";

// AUDIT(no-tenant): the /admin/* surface is platform-operator-only and
// intentionally cross-tenant (list all orgs, cross-tenant usage reports,
// suspend any tenant). Access is gated by the X-Admin-Key header check in
// the middleware below, which is why we use the system-scope client.
const adminDb = getSystemDb();

export const adminRoutes = new OpenAPIHono();

// ── Admin auth guard ───────────────────────────────────────────────────────

adminRoutes.use("*", async (c, next) => {
  const key = c.req.header("x-admin-key");
  if (!key || key !== env.ADMIN_API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
});

// ── Schemas ────────────────────────────────────────────────────────────────

const OrgIdParam = z.object({ id: z.string().min(1) });

const FeatureFlagSchema = z.object({
  organizationId: z.string(),
  flag: z.string().min(1),
  enabled: z.boolean(),
});

// ── In-memory feature flag overrides (replace with Redis/DB in prod) ───────

const flagOverrides = new Map<string, Record<string, boolean>>();

// ── Routes ─────────────────────────────────────────────────────────────────

// GET /tenants
adminRoutes.openapi(
  createRoute({
    method: "get",
    path: "/tenants",
    tags: ["Admin"],
    summary: "List all organizations",
    request: {
      query: z.object({
        limit: z.coerce.number().int().min(1).max(200).default(50),
        offset: z.coerce.number().int().min(0).default(0),
        plan: z.enum(["FREE", "PRO", "ENTERPRISE"]).optional(),
      }),
    },
    responses: { 200: { description: "Organization list" } },
  }),
  async (c) => {
    const { limit, offset, plan } = c.req.valid("query");

    const findParams: any = {
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true, apiKeys: true } },
      },
    };
    if (plan) {
      findParams.where = { plan };
    }

    const [orgs, total] = await Promise.all([
      adminDb.organization.findMany(findParams),
      (async () => {
        const countParams: Parameters<typeof adminDb.organization.count>[0] = {};
        if (plan) {
          countParams.where = { plan };
        }
        return adminDb.organization.count(countParams);
      })(),
    ]);

    return c.json({ data: orgs, meta: { total, limit, offset } });
  },
);

// GET /tenants/:id
adminRoutes.openapi(
  createRoute({
    method: "get",
    path: "/tenants/{id}",
    tags: ["Admin"],
    summary: "Get organization details with live usage",
    request: { params: OrgIdParam },
    responses: { 200: { description: "Organization details" }, 404: { description: "Not found" } },
  }),
  async (c) => {
    const { id } = c.req.valid("param");

    const org = await adminDb.organization.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { email: true, name: true } } } },
        apiKeys: {
          where: { revokedAt: null },
          select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true },
        },
        _count: { select: { members: true, apiKeys: true } },
      },
    });

    if (!org) return c.json({ error: "Not found" }, 404);

    const usage = await getUsageSnapshot(id);

    return c.json({ ...org, usage });
  },
);

// POST /tenants/:id/suspend
adminRoutes.openapi(
  createRoute({
    method: "post",
    path: "/tenants/{id}/suspend",
    tags: ["Admin"],
    summary: "Suspend an organization (block API access)",
    request: { params: OrgIdParam },
    responses: { 200: { description: "Suspended" }, 404: { description: "Not found" } },
  }),
  async (c) => {
    const { id } = c.req.valid("param");

    const org = await adminDb.organization.findUnique({ where: { id } });
    if (!org) return c.json({ error: "Not found" }, 404);

    // Revoke all API keys (effectively blocks all API access)
    const revoked = await adminDb.aPIKey.updateMany({
      where: { organizationId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return c.json({ organizationId: id, status: "suspended", keysRevoked: revoked.count });
  },
);

// POST /tenants/:id/unsuspend
adminRoutes.openapi(
  createRoute({
    method: "post",
    path: "/tenants/{id}/unsuspend",
    tags: ["Admin"],
    summary: "Restore a suspended organization",
    request: { params: OrgIdParam },
    responses: { 200: { description: "Unsuspended" }, 404: { description: "Not found" } },
  }),
  async (c) => {
    const { id } = c.req.valid("param");

    const org = await adminDb.organization.findUnique({ where: { id } });
    if (!org) return c.json({ error: "Not found" }, 404);

    // Generate a fresh default key on restore
    const crypto = await import("node:crypto");
    const random = crypto.randomBytes(24).toString("hex");
    const plaintext = `nbtr_live_${random}`;
    const prefix = plaintext.slice(0, 16);
    const hash = crypto.createHash("sha256").update(plaintext).digest("hex");

    await adminDb.aPIKey.create({
      data: {
        name: "Restored Key",
        keyHash: hash,
        keyPrefix: prefix,
        organizationId: id,
      },
    });

    logger.info("Organization unsuspended by admin", { organizationId: id, newKeyPrefix: prefix });

    return c.json({ organizationId: id, status: "active", newKeyPrefix: prefix });
  },
);

// GET /usage/report
adminRoutes.openapi(
  createRoute({
    method: "get",
    path: "/usage/report",
    tags: ["Admin"],
    summary: "Cross-tenant usage report for current billing period",
    request: {
      query: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(20),
      }),
    },
    responses: { 200: { description: "Usage report" } },
  }),
  async (c) => {
    const { limit } = c.req.valid("query");

    const orgs = await adminDb.organization.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, plan: true },
    });

    const usageList = await Promise.all(
      orgs.map(async (org) => ({
        ...org,
        usage: await getUsageSnapshot(org.id),
      })),
    );

    return c.json({ data: usageList, generatedAt: new Date().toISOString() });
  },
);

// GET /dlq
adminRoutes.openapi(
  createRoute({
    method: "get",
    path: "/dlq",
    tags: ["Admin"],
    summary: "List dead letter queue entries",
    responses: { 200: { description: "DLQ entries" } },
  }),
  async (c) => {
    const entries = getDeadLetterQueue();
    return c.json({ data: entries, total: entries.length });
  },
);

// POST /dlq/:id/ack
adminRoutes.openapi(
  createRoute({
    method: "post",
    path: "/dlq/{id}/ack",
    tags: ["Admin"],
    summary: "Acknowledge a DLQ entry (remove from queue)",
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: { description: "Acknowledged" } },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    ackDeadLetter(id);
    return c.json({ id, status: "acknowledged" });
  },
);

// GET /feature-flags
adminRoutes.openapi(
  createRoute({
    method: "get",
    path: "/feature-flags",
    tags: ["Admin"],
    summary: "List per-tenant feature flag overrides",
    responses: { 200: { description: "Feature flag overrides" } },
  }),
  async (c) => {
    const overrides: Record<string, Record<string, boolean>> = {};
    for (const [orgId, flags] of flagOverrides.entries()) {
      overrides[orgId] = flags;
    }
    return c.json({ overrides });
  },
);

// POST /feature-flags
adminRoutes.openapi(
  createRoute({
    method: "post",
    path: "/feature-flags",
    tags: ["Admin"],
    summary: "Set a per-tenant feature flag override",
    request: { body: { content: { "application/json": { schema: FeatureFlagSchema } } } },
    responses: { 200: { description: "Updated" } },
  }),
  async (c) => {
    const { organizationId, flag, enabled } = c.req.valid("json");

    const existing = flagOverrides.get(organizationId) ?? {};
    flagOverrides.set(organizationId, { ...existing, [flag]: enabled });

    logger.info("Feature flag override set", { organizationId, flag, enabled });

    return c.json({ organizationId, flag, enabled });
  },
);
