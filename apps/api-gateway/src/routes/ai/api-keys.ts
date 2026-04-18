/**
 * /api/v1/ai/api-keys — API Key management
 *
 * Customers create/list/revoke/update API keys scoped to their organization.
 * Keys are hashed with SHA-256 before storage; the raw key is returned ONCE
 * at creation time. Cached lookups in Redis are invalidated on revoke/update.
 */

import { createHash, randomBytes } from "node:crypto";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getRedis } from "@nebutra/cache";
import { getTenantDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { requireAuth, requireOrganization } from "../../middlewares/tenantContext.js";

const log = logger.child({ service: "api-keys" });

export const apiKeysRoutes = new OpenAPIHono();
apiKeysRoutes.use("*", requireAuth, requireOrganization);

// ── Helpers ───────────────────────────────────────────────────────────────────

const KEY_CACHE_PREFIX = "apikey:";

function generateFullKey(): string {
  return `sk-sailor-${randomBytes(32).toString("hex")}`;
}

function hashKey(fullKey: string): string {
  return createHash("sha256").update(fullKey).digest("hex");
}

/**
 * Best-effort Redis cache invalidation. Redis may be unavailable (e.g. dev),
 * so we log and continue rather than failing the request.
 */
async function invalidateKeyCache(keyHash: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(`${KEY_CACHE_PREFIX}${keyHash}`);
  } catch (err) {
    log.warn("Failed to invalidate API key cache", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(64),
  scopes: z.array(z.string()).optional(),
  rateLimitRps: z.number().int().min(1).max(10_000).optional(),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
});

const UpdateApiKeySchema = z
  .object({
    name: z.string().min(1).max(64).optional(),
    scopes: z.array(z.string()).optional(),
    rateLimitRps: z.number().int().min(1).max(10_000).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field required" });

const ApiKeyMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  keyPrefix: z.string(),
  scopes: z.array(z.string()),
  rateLimitRps: z.number(),
  lastUsedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
});

const CreatedApiKeySchema = z.object({
  id: z.string(),
  key: z.string().describe("Full API key — shown only once. Store it securely."),
  name: z.string(),
  keyPrefix: z.string(),
  scopes: z.array(z.string()),
  rateLimitRps: z.number(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  warning: z.string(),
});

const IdParamSchema = z.object({ id: z.string().min(1) });

// ── Routes ────────────────────────────────────────────────────────────────────

const createRouteDef = createRoute({
  method: "post",
  path: "/",
  tags: ["API Keys"],
  summary: "Create a new API key",
  description: "Returns the full key ONCE. Store it securely — it cannot be retrieved later.",
  request: { body: { content: { "application/json": { schema: CreateApiKeySchema } } } },
  responses: {
    201: {
      description: "API key created",
      content: { "application/json": { schema: CreatedApiKeySchema } },
    },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
  },
});

apiKeysRoutes.openapi(createRouteDef, async (c) => {
  const tenant = c.get("tenant");
  const organizationId = tenant.organizationId as string;
  const body = c.req.valid("json");
  const db = getTenantDb(organizationId);

  const fullKey = generateFullKey();
  const keyHash = hashKey(fullKey);
  const keyPrefix = fullKey.slice(0, 12);

  const expiresAt = body.expiresInDays
    ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const created = await db.aPIKey.create({
    data: {
      name: body.name,
      keyHash,
      keyPrefix,
      organizationId,
      createdById: tenant.userId ?? null,
      scopes: body.scopes ?? [],
      ...(body.rateLimitRps !== undefined ? { rateLimitRps: body.rateLimitRps } : {}),
      expiresAt,
    },
  });

  log.info("API key created", {
    apiKeyId: created.id,
    organizationId,
    keyPrefix,
  });

  return c.json(
    {
      id: created.id,
      key: fullKey,
      name: created.name,
      keyPrefix: created.keyPrefix,
      scopes: created.scopes,
      rateLimitRps: created.rateLimitRps,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
      warning: "This is the only time the full key will be shown. Save it securely now.",
    },
    201,
  );
});

const listRouteDef = createRoute({
  method: "get",
  path: "/",
  tags: ["API Keys"],
  summary: "List API keys for the current organization",
  responses: {
    200: {
      description: "List of API keys",
      content: {
        "application/json": {
          schema: z.object({ data: z.array(ApiKeyMetadataSchema) }),
        },
      },
    },
  },
});

apiKeysRoutes.openapi(listRouteDef, async (c) => {
  const tenant = c.get("tenant");
  const organizationId = tenant.organizationId as string;
  const db = getTenantDb(organizationId);

  const keys = await db.aPIKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });

  const data = keys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    scopes: k.scopes,
    rateLimitRps: k.rateLimitRps,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    revokedAt: k.revokedAt?.toISOString() ?? null,
    expiresAt: k.expiresAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));

  return c.json({ data }, 200);
});

const revokeRouteDef = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["API Keys"],
  summary: "Revoke an API key",
  description: "Soft-delete: sets revokedAt. Invalidates Redis cache.",
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: "Revoked",
      content: {
        "application/json": {
          schema: z.object({ id: z.string(), revokedAt: z.string() }),
        },
      },
    },
    404: { description: "Not found" },
  },
});

apiKeysRoutes.openapi(revokeRouteDef, async (c) => {
  const tenant = c.get("tenant");
  const organizationId = tenant.organizationId as string;
  const { id } = c.req.valid("param");
  const db = getTenantDb(organizationId);

  const existing = await db.aPIKey.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    return c.json({ error: "Not Found", message: "API key not found" }, 404);
  }

  const revokedAt = new Date();
  const updated = await db.aPIKey.update({
    where: { id },
    data: { revokedAt },
  });

  await invalidateKeyCache(existing.keyHash);

  log.info("API key revoked", { apiKeyId: id, organizationId });

  return c.json(
    {
      id: updated.id,
      revokedAt: updated.revokedAt!.toISOString(),
    },
    200,
  );
});

const patchRouteDef = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["API Keys"],
  summary: "Update API key metadata",
  request: {
    params: IdParamSchema,
    body: { content: { "application/json": { schema: UpdateApiKeySchema } } },
  },
  responses: {
    200: {
      description: "Updated",
      content: { "application/json": { schema: ApiKeyMetadataSchema } },
    },
    404: { description: "Not found" },
  },
});

apiKeysRoutes.openapi(patchRouteDef, async (c) => {
  const tenant = c.get("tenant");
  const organizationId = tenant.organizationId as string;
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const db = getTenantDb(organizationId);

  const existing = await db.aPIKey.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    return c.json({ error: "Not Found", message: "API key not found" }, 404);
  }

  const updated = await db.aPIKey.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.scopes !== undefined ? { scopes: body.scopes } : {}),
      ...(body.rateLimitRps !== undefined ? { rateLimitRps: body.rateLimitRps } : {}),
    },
  });

  await invalidateKeyCache(existing.keyHash);

  log.info("API key updated", { apiKeyId: id, organizationId });

  return c.json(
    {
      id: updated.id,
      name: updated.name,
      keyPrefix: updated.keyPrefix,
      scopes: updated.scopes,
      rateLimitRps: updated.rateLimitRps,
      lastUsedAt: updated.lastUsedAt?.toISOString() ?? null,
      revokedAt: updated.revokedAt?.toISOString() ?? null,
      expiresAt: updated.expiresAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    },
    200,
  );
});
