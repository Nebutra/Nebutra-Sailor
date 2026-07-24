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
 *   GET  /feature-flags    — list runtime-only feature flag override records
 *   POST /feature-flags    — record a runtime-only feature flag override
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getSystemDb } from "@nebutra/db";
import { ackDeadLetter, getDeadLetterQueue } from "@nebutra/event-bus";
import { logger } from "@nebutra/logger";
import { env } from "../../config/env.js";
import { hashApiKey } from "../../lib/api-key.js";
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

// ── Runtime-only feature flag override records ─────────────────────────────

type RuntimeOnlyFeatureFlagOverride = {
  enabled: boolean;
  updatedAt: string;
  updatedBy: "admin-api";
};

const runtimeOnlyFeatureFlagOverrideMetadata = {
  storage: "process-memory",
  scope: "single-process",
  persistence: "runtime-only",
  persistent: false,
  productionSafe: false,
  appliesToFeatureEvaluation: false,
  warning:
    "Admin feature flag overrides are recorded in this gateway process only. They are lost on restart, do not propagate across instances, and are not wired into the durable feature flag provider.",
} as const;

// This store intentionally remains process-local until a durable provider is
// chosen. Keep responses explicit so callers cannot mistake it for production
// persistence or cross-instance rollout state.
const runtimeOnlyFlagOverrideRecords = new Map<
  string,
  Record<string, RuntimeOnlyFeatureFlagOverride>
>();

function snapshotRuntimeOnlyFlagOverrides() {
  const overrides: Record<string, Record<string, boolean>> = {};
  const runtimeOnlyOverrides: Record<string, Record<string, RuntimeOnlyFeatureFlagOverride>> = {};

  for (const [orgId, flags] of runtimeOnlyFlagOverrideRecords.entries()) {
    overrides[orgId] = {};
    runtimeOnlyOverrides[orgId] = {};

    for (const [flag, record] of Object.entries(flags)) {
      overrides[orgId][flag] = record.enabled;
      runtimeOnlyOverrides[orgId][flag] = { ...record };
    }
  }

  return {
    overrides,
    runtimeOnlyOverrides,
    metadata: runtimeOnlyFeatureFlagOverrideMetadata,
  };
}

// ── Routes ─────────────────────────────────────────────────────────────────

const AdminTenantsListSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())),
  meta: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
});

const AdminTenantDetailSchema = z.record(z.string(), z.unknown());

const AdminSuspendSchema = z.object({
  organizationId: z.string(),
  status: z.literal("suspended"),
  keysRevoked: z.number(),
});

const AdminUnsuspendSchema = z.object({
  organizationId: z.string(),
  status: z.literal("active"),
  newKeyPrefix: z.string(),
});

const AdminUsageReportSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())),
  generatedAt: z.string(),
});

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
    responses: {
      200: {
        description: "Organization list",
        content: { "application/json": { schema: AdminTenantsListSchema } },
      },
    },
  }),
  async (c) => {
    const { limit, offset, plan } = c.req.valid("query");

    const findParams: NonNullable<Parameters<typeof adminDb.organization.findMany>[0]> = {
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true } },
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
    responses: {
      200: {
        description: "Organization details",
        content: { "application/json": { schema: AdminTenantDetailSchema } },
      },
      404: { description: "Not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");

    const org = await adminDb.organization.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { email: true, name: true } } } },
        tenant: {
          include: {
            apiKeys: {
              where: { revokedAt: null },
              select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true },
            },
            _count: { select: { apiKeys: true } },
          },
        },
        _count: { select: { members: true } },
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
    responses: {
      200: {
        description: "Suspended",
        content: { "application/json": { schema: AdminSuspendSchema } },
      },
      404: { description: "Not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");

    const org = await adminDb.organization.findUnique({ where: { id } });
    if (!org) return c.json({ error: "Not found" }, 404);

    // Revoke all API keys (effectively blocks all API access)
    const revoked = await adminDb.aPIKey.updateMany({
      where: { tenantId: id, revokedAt: null },
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
    responses: {
      200: {
        description: "Unsuspended",
        content: { "application/json": { schema: AdminUnsuspendSchema } },
      },
      404: { description: "Not found" },
    },
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
    const hash = hashApiKey(plaintext);

    await adminDb.aPIKey.create({
      data: {
        name: "Restored Key",
        keyHash: hash,
        keyPrefix: prefix,
        tenantId: id,
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
    responses: {
      200: {
        description: "Usage report",
        content: { "application/json": { schema: AdminUsageReportSchema } },
      },
    },
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
    summary: "List runtime-only per-tenant feature flag override records",
    responses: { 200: { description: "Runtime-only feature flag override records" } },
  }),
  async (c) => {
    return c.json(snapshotRuntimeOnlyFlagOverrides());
  },
);

// POST /feature-flags
adminRoutes.openapi(
  createRoute({
    method: "post",
    path: "/feature-flags",
    tags: ["Admin"],
    summary: "Record a runtime-only per-tenant feature flag override",
    request: { body: { content: { "application/json": { schema: FeatureFlagSchema } } } },
    responses: { 200: { description: "Runtime-only override record updated" } },
  }),
  async (c) => {
    const { organizationId, flag, enabled } = c.req.valid("json");
    const updatedAt = new Date().toISOString();
    const runtimeOnlyOverride: RuntimeOnlyFeatureFlagOverride = {
      enabled,
      updatedAt,
      updatedBy: "admin-api",
    };

    const existing = runtimeOnlyFlagOverrideRecords.get(organizationId) ?? {};
    runtimeOnlyFlagOverrideRecords.set(organizationId, {
      ...existing,
      [flag]: runtimeOnlyOverride,
    });

    logger.info("Runtime-only feature flag override recorded", {
      auditEvent: "admin.feature_flag_override.runtime_only.recorded",
      organizationId,
      flag,
      enabled,
      requestId: c.get("requestId"),
      updatedAt,
      storage: runtimeOnlyFeatureFlagOverrideMetadata.storage,
      persistence: runtimeOnlyFeatureFlagOverrideMetadata.persistence,
      persistent: runtimeOnlyFeatureFlagOverrideMetadata.persistent,
      productionSafe: runtimeOnlyFeatureFlagOverrideMetadata.productionSafe,
      appliesToFeatureEvaluation: runtimeOnlyFeatureFlagOverrideMetadata.appliesToFeatureEvaluation,
    });

    return c.json({
      organizationId,
      flag,
      enabled,
      runtimeOnlyOverride,
      metadata: runtimeOnlyFeatureFlagOverrideMetadata,
    });
  },
);
