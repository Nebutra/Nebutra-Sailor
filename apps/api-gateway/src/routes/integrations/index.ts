/**
 * /api/v1/integrations — Integration management routes
 *
 * CRUD for third-party integrations (Shopify, Shopline, Stripe, custom).
 * Auth + tenant context applied upstream.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { prisma } from "@nebutra/db";
import { toApiError } from "@nebutra/errors";

export const integrationRoutes = new OpenAPIHono();

// ── Schemas ───────────────────────────────────────────────────────────────────

const IntegrationTypeEnum = z.enum(["SHOPIFY", "SHOPLINE", "STRIPE", "CUSTOM"]);

const CreateIntegrationSchema = z.object({
  type: IntegrationTypeEnum,
  name: z.string().min(1).max(100),
  credentials: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const UpdateIntegrationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

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
  const orgId = tenant?.organizationId ?? "";

  try {
    const integrations = await prisma.integration.findMany({
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
        // Never return credentials in list
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
  summary: "Get integration by ID",
  responses: {
    200: { description: "Integration details" },
    404: { description: "Not found" },
  },
});

integrationRoutes.openapi(getRoute, async (c) => {
  const tenant = c.get("tenant");
  const orgId = tenant?.organizationId ?? "";
  const id = c.req.param("id");

  try {
    const integration = await prisma.integration.findFirst({
      where: { id, organizationId: orgId },
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
  const orgId = tenant?.organizationId ?? "";
  const body = c.req.valid("json");

  try {
    const integration = await prisma.integration.create({
      data: {
        organizationId: orgId,
        type: body.type,
        name: body.name,
        credentials: (body.credentials ?? {}) as any,
        settings: (body.settings ?? {}) as any,
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
  const orgId = tenant?.organizationId ?? "";
  const id = c.req.param("id");
  const body = c.req.valid("json");

  try {
    // Verify ownership
    const existing = await prisma.integration.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return c.json({ error: "Integration not found" }, 404);

    const updated = await prisma.integration.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.credentials !== undefined ? { credentials: body.credentials as any } : {}),
        ...(body.settings !== undefined ? { settings: body.settings as any } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
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
  const orgId = tenant?.organizationId ?? "";
  const id = c.req.param("id");

  try {
    const existing = await prisma.integration.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return c.json({ error: "Integration not found" }, 404);

    await prisma.integration.delete({ where: { id } });

    return c.json({ deleted: true, id });
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 500);
  }
});
