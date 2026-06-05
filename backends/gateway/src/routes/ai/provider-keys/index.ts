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
 * (`••••last4`). Reads require `read` and mutations require `manage` on the
 * `AiProviderKey` CASL resource (owner/admin) — aligned with the web
 * provider_key:* scope matrix.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getStatusCode, toApiError } from "@nebutra/errors";
import {
  getTenantProviderKeyRepository,
  isSafeUpstreamBaseUrl,
  type ProviderKeyCredentials,
  type TenantProviderKeyRepository,
} from "@nebutra/repositories";
import { requirePermission } from "../../../middlewares/permissions.js";
import { requireAuth, requireOrganization } from "../../../middlewares/tenantContext.js";

export const providerKeyRoutes = new OpenAPIHono();

providerKeyRoutes.use("*", requireAuth, requireOrganization);

// CASL-gated, aligned with the web provider_key:* matrix (admin/owner only):
// reads require `read`, mutations require `manage` on AiProviderKey.
providerKeyRoutes.use("*", async (c, next) => {
  const action = c.req.method === "GET" ? "read" : "manage";
  return requirePermission(action, "AiProviderKey")(c, next);
});

const ProviderEnum = z.enum(["OPENAI", "ANTHROPIC", "GOOGLE", "SILICONFLOW", "CUSTOM"]);

const UpsertProviderKeySchema = z
  .object({
    provider: ProviderEnum,
    apiKey: z.string().min(8).max(400),
    baseUrl: z
      .string()
      .url()
      .max(300)
      .refine(isSafeUpstreamBaseUrl, {
        message: "baseUrl must be a public https endpoint (no private/loopback/metadata hosts).",
      })
      .optional(),
    label: z.string().max(80).optional(),
    alwaysUse: z.boolean().optional(),
  })
  .refine((v) => v.provider !== "CUSTOM" || (v.baseUrl !== undefined && v.baseUrl.length > 0), {
    message: "baseUrl is required for the CUSTOM provider.",
    path: ["baseUrl"],
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
    return c.json({ error: apiError.error.message }, getStatusCode(err) as 400 | 500);
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
    // Delete directly and map Prisma's "record not found" (P2025) to 404. This
    // avoids a check-then-delete race between two repository calls.
    await toRepo(orgId).delete(provider);
    return c.json({ deleted: true, provider });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return c.json({ error: "Provider key not found" }, 404);
    }
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 500);
  }
});
