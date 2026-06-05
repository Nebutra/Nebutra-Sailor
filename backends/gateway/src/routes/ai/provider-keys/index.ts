/**
 * /api/v1/ai/provider-keys — BYOK provider key management.
 *
 * CRUD for customer-owned AI provider API keys (OpenRouter-style). One key per
 * provider per tenant. The plaintext key is ENCRYPTED AT REST via the
 * @nebutra/vault Prisma extension (see packages/platform/db/src/client.ts) — the
 * TenantProviderKeyRepository works with plaintext and the extension encrypts on
 * write / decrypts on read.
 *
 * The list/get responses NEVER return the raw key — only a masked preview
 * (`••••last4`). Mutations require `manage` on the `AiProviderKey` CASL resource
 * (owner/admin); reads require auth + organization context only.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { toApiError } from "@nebutra/errors";
import {
  getTenantProviderKeyRepository,
  type ProviderKeyCredentials,
  type TenantProviderKeyRepository,
} from "@nebutra/repositories";
import { requirePermission } from "../../../middlewares/permissions.js";
import { requireAuth, requireOrganization } from "../../../middlewares/tenantContext.js";

export const providerKeyRoutes = new OpenAPIHono();

providerKeyRoutes.use("*", requireAuth, requireOrganization);

// Reads are open to any org member; mutations require `manage` on AiProviderKey
// (owner/admin). Applied as a single gate so GET stays unguarded while
// POST/DELETE go through CASL.
providerKeyRoutes.use("*", async (c, next) => {
  if (c.req.method === "GET") return next();
  return requirePermission("manage", "AiProviderKey")(c, next);
});

const ProviderEnum = z.enum(["OPENAI", "ANTHROPIC", "GOOGLE", "SILICONFLOW", "CUSTOM"]);

const UpsertProviderKeySchema = z.object({
  provider: ProviderEnum,
  apiKey: z.string().min(8).max(400),
  baseUrl: z.string().url().max(300).optional(),
  label: z.string().max(80).optional(),
  alwaysUse: z.boolean().optional(),
});

/** Mask a secret for display — keep the last 4 chars only. */
function maskKey(apiKey: string): string {
  if (apiKey.length <= 4) return "••••";
  return `••••${apiKey.slice(-4)}`;
}

function toRepo(orgId: string): TenantProviderKeyRepository {
  return getTenantProviderKeyRepository(orgId);
}

// ── List provider keys (masked) ─────────────────────────────────────────────

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Provider Keys"],
  summary: "List BYOK provider keys for the current organization (key masked)",
  responses: { 200: { description: "List of provider keys" } },
});

providerKeyRoutes.openapi(listRoute, async (c) => {
  const orgId = c.get("tenant").organizationId as string;
  try {
    const rows = await toRepo(orgId).list();
    const keys = rows.map((row) => {
      const creds = row.credentials as unknown as ProviderKeyCredentials | null;
      return {
        id: row.id,
        provider: row.provider,
        label: row.label,
        isActive: row.isActive,
        alwaysUse: row.alwaysUse,
        baseUrl: creds?.baseUrl ?? null,
        maskedKey: creds?.apiKey ? maskKey(creds.apiKey) : null,
        lastTestedAt: row.lastTestedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
    return c.json({ keys, total: keys.length });
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 500);
  }
});

// ── Create / replace a provider key ─────────────────────────────────────────

const upsertRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Provider Keys"],
  summary: "Add or replace the BYOK key for a provider",
  request: {
    body: { content: { "application/json": { schema: UpsertProviderKeySchema } } },
  },
  responses: {
    201: { description: "Provider key saved" },
    400: { description: "Invalid request" },
  },
});

providerKeyRoutes.openapi(upsertRoute, async (c) => {
  const orgId = c.get("tenant").organizationId as string;
  const body = c.req.valid("json");
  try {
    const row = await toRepo(orgId).upsert({
      provider: body.provider,
      apiKey: body.apiKey,
      ...(body.baseUrl ? { baseUrl: body.baseUrl } : {}),
      ...(body.label !== undefined ? { label: body.label } : {}),
      ...(body.alwaysUse !== undefined ? { alwaysUse: body.alwaysUse } : {}),
    });
    return c.json(
      {
        id: row.id,
        provider: row.provider,
        label: row.label,
        isActive: row.isActive,
        alwaysUse: row.alwaysUse,
        maskedKey: maskKey(body.apiKey),
        createdAt: row.createdAt,
      },
      201,
    );
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 400);
  }
});

// ── Delete a provider key ───────────────────────────────────────────────────

const deleteRoute = createRoute({
  method: "delete",
  path: "/:provider",
  tags: ["Provider Keys"],
  summary: "Delete the BYOK key for a provider",
  request: { params: z.object({ provider: ProviderEnum }) },
  responses: {
    200: { description: "Provider key deleted" },
    404: { description: "Not found" },
  },
});

providerKeyRoutes.openapi(deleteRoute, async (c) => {
  const orgId = c.get("tenant").organizationId as string;
  const provider = c.req.valid("param").provider;
  try {
    const existing = await toRepo(orgId).findByProvider(provider);
    if (!existing) return c.json({ error: "Provider key not found" }, 404);
    await toRepo(orgId).delete(provider);
    return c.json({ deleted: true, provider });
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 500);
  }
});
