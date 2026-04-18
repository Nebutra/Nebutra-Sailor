/**
 * /api/v1/integrations — Integration management routes
 *
 * CRUD for third-party integrations (Shopify, Shopline, Stripe, custom).
 * Auth + tenant context applied upstream.
 *
 * ── Secrets at rest ──────────────────────────────────────────────────────────
 * `credentials` and `settings` are ENCRYPTED AT REST via the @nebutra/vault
 * Prisma extension (see packages/db/src/client.ts). Routes work with plaintext
 * values — the extension transparently:
 *   - encrypts on create/update/upsert (tenant-bound ciphertext)
 *   - decrypts on findFirst/findMany/etc.
 *
 * The `list` endpoint intentionally excludes `credentials` (defence-in-depth);
 * callers must fetch by id to receive the decrypted credentials.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getTenantDb, type Prisma } from "@nebutra/db";
import { toApiError } from "@nebutra/errors";
import { requireAuth, requireOrganization } from "../../middlewares/tenantContext.js";

export const integrationRoutes = new OpenAPIHono();
// Every route below issues tenant-scoped queries via getTenantDb() — we must
// have a resolved organizationId on the Hono context before any handler runs.
integrationRoutes.use("*", requireAuth, requireOrganization);

// ── Schemas ───────────────────────────────────────────────────────────────────

const IntegrationTypeEnum = z.enum(["SHOPIFY", "SHOPLINE", "STRIPE", "CUSTOM"]);

/** JSON-compatible object accepted for credentials / settings. */
const JsonObjectSchema: z.ZodType<Record<string, unknown>> = z.record(z.string(), z.unknown());

const CreateIntegrationSchema = z.object({
  type: IntegrationTypeEnum,
  name: z.string().min(1).max(100),
  credentials: JsonObjectSchema.optional(),
  settings: JsonObjectSchema.optional(),
});

const UpdateIntegrationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  credentials: JsonObjectSchema.optional(),
  settings: JsonObjectSchema.optional(),
  isActive: z.boolean().optional(),
});

/**
 * Narrow a validated JSON-object input to Prisma's InputJsonValue. This is the
 * single safe cast site: the Zod schema above has already guaranteed that the
 * value is a plain object of JSON-compatible keys/values, so the widening cast
 * here doesn't leak `any` into the rest of the handler.
 */
function toJsonInput(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

// ── List integrations ─────────────────────────────────────────────────────────

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Integrations"],
  summary: "List all integrations for the current organization",
  responses: {
    200: { description: "List of integrations" },
  },
});

integrationRoutes.openapi(listRoute, async (c) => {
  const tenant = c.get("tenant");
  const orgId = tenant.organizationId as string;
  const db = getTenantDb(orgId);

  try {
    // Policy: list endpoint does NOT return credentials. Callers must GET /:id
    // to receive the decrypted credentials. `settings` is included (non-secret
    // configuration) and decrypted transparently by the DB extension.
    const integrations = await db.integration.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        name: true,
        isActive: true,
        lastSyncAt: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return c.json({ integrations, total: integrations.length });
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 500);
  }
});

// ── Get single integration ────────────────────────────────────────────────────

const getRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Integrations"],
  summary: "Get integration by ID (returns decrypted credentials and settings)",
  responses: {
    200: { description: "Integration details" },
    404: { description: "Not found" },
  },
});

integrationRoutes.openapi(getRoute, async (c) => {
  const tenant = c.get("tenant");
  const orgId = tenant.organizationId as string;
  const id = c.req.param("id");
  const db = getTenantDb(orgId);

  try {
    const integration = await db.integration.findFirst({
      where: { id, organizationId: orgId },
      select: {
        id: true,
        type: true,
        name: true,
        isActive: true,
        lastSyncAt: true,
        credentials: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!integration) {
      return c.json({ error: "Integration not found" }, 404);
    }

    return c.json(integration);
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 500);
  }
});

// ── Create integration ────────────────────────────────────────────────────────

const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Integrations"],
  summary: "Create a new integration",
  request: {
    body: { content: { "application/json": { schema: CreateIntegrationSchema } } },
  },
  responses: {
    201: { description: "Integration created" },
    400: { description: "Invalid request" },
    409: { description: "Integration already exists" },
  },
});

integrationRoutes.openapi(createRoute_, async (c) => {
  const tenant = c.get("tenant");
  const orgId = tenant.organizationId as string;
  const body = c.req.valid("json");
  const db = getTenantDb(orgId);

  try {
    // credentials/settings are encrypted by the DB Prisma extension before
    // the row is persisted — we pass validated plaintext here.
    const integration = await db.integration.create({
      data: {
        organizationId: orgId,
        type: body.type,
        name: body.name,
        credentials: toJsonInput(body.credentials ?? {}),
        settings: toJsonInput(body.settings ?? {}),
      },
      select: {
        id: true,
        type: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    return c.json(integration, 201);
  } catch (err: unknown) {
    // Handle unique constraint violation
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return c.json(
        { error: `Integration "${body.name}" of type ${body.type} already exists` },
        409,
      );
    }
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 400);
  }
});

// ── Update integration ────────────────────────────────────────────────────────

const updateRoute = createRoute({
  method: "patch",
  path: "/:id",
  tags: ["Integrations"],
  summary: "Update an integration",
  request: {
    body: { content: { "application/json": { schema: UpdateIntegrationSchema } } },
  },
  responses: {
    200: { description: "Updated integration" },
    404: { description: "Not found" },
  },
});

integrationRoutes.openapi(updateRoute, async (c) => {
  const tenant = c.get("tenant");
  const orgId = tenant.organizationId as string;
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const db = getTenantDb(orgId);

  try {
    // Verify ownership (RLS also protects this, but explicit is clearer).
    const existing = await db.integration.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!existing) return c.json({ error: "Integration not found" }, 404);

    // Build update payload with only the fields the caller supplied. Plaintext
    // credentials/settings are re-encrypted by the DB Prisma extension.
    const data: Prisma.IntegrationUpdateInput = {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.credentials !== undefined
        ? { credentials: toJsonInput(body.credentials) }
        : {}),
      ...(body.settings !== undefined ? { settings: toJsonInput(body.settings) } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    };

    const updated = await db.integration.update({
      where: { id },
      data,
      select: {
        id: true,
        type: true,
        name: true,
        isActive: true,
        settings: true,
        updatedAt: true,
      },
    });

    return c.json(updated);
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 400);
  }
});

// ── Delete integration ────────────────────────────────────────────────────────

const deleteRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Integrations"],
  summary: "Delete an integration",
  responses: {
    200: { description: "Integration deleted" },
    404: { description: "Not found" },
  },
});

integrationRoutes.openapi(deleteRoute, async (c) => {
  const tenant = c.get("tenant");
  const orgId = tenant.organizationId as string;
  const id = c.req.param("id");
  const db = getTenantDb(orgId);

  try {
    const existing = await db.integration.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!existing) return c.json({ error: "Integration not found" }, 404);

    await db.integration.delete({ where: { id } });

    return c.json({ deleted: true, id });
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 500);
  }
});
