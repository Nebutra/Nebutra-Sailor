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
const IsoDateTimeSchema = z.string().datetime();
const JsonErrorSchema = z.object({ error: z.string() });

const jsonErrorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: JsonErrorSchema } },
});

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

const ProviderKeySchema = z.object({
  id: z.string(),
  provider: ProviderEnum,
  label: z.string().nullable(),
  isActive: z.boolean(),
  alwaysUse: z.boolean(),
  baseUrl: z.string().nullable().optional(),
  maskedKey: z.string().nullable(),
  lastTestedAt: IsoDateTimeSchema.nullable().optional(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema.optional(),
});

const ProviderKeyListSchema = z.object({
  keys: z.array(ProviderKeySchema),
  total: z.number().int(),
});

const ProviderKeyDeletedSchema = z.object({
  deleted: z.boolean(),
  provider: ProviderEnum,
});

type ProviderKeyResponse = z.infer<typeof ProviderKeySchema>;

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toNullableIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return toIsoString(value);
}

/** Mask a secret for display — keep the last 4 chars only. */
function maskKey(apiKey: string): string {
  if (apiKey.length <= 4) return "••••";
  return `••••${apiKey.slice(-4)}`;
}

function toRepo(orgId: string): TenantProviderKeyRepository {
  return getTenantProviderKeyRepository(orgId);
}

function serializeProviderKey(
  row: Awaited<ReturnType<TenantProviderKeyRepository["list"]>>[number],
  apiKey?: string,
): ProviderKeyResponse {
  const creds = row.credentials as unknown as ProviderKeyCredentials | null;
  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    isActive: row.isActive,
    alwaysUse: row.alwaysUse,
    baseUrl: creds?.baseUrl ?? null,
    maskedKey: apiKey ? maskKey(apiKey) : creds?.apiKey ? maskKey(creds.apiKey) : null,
    lastTestedAt: toNullableIsoString(row.lastTestedAt),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

// ── List provider keys (masked) ─────────────────────────────────────────────

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Provider Keys"],
  summary: "List BYOK provider keys for the current organization (key masked)",
  responses: {
    200: {
      description: "List of provider keys",
      content: { "application/json": { schema: ProviderKeyListSchema } },
    },
    500: jsonErrorResponse("Failed to list provider keys"),
  },
});

providerKeyRoutes.openapi(listRoute, async (c) => {
  const orgId = c.get("tenant").organizationId as string;
  try {
    const rows = await toRepo(orgId).list();
    const keys = rows.map((row) => serializeProviderKey(row));
    return c.json({ keys, total: keys.length }, 200);
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
    201: {
      description: "Provider key saved",
      content: { "application/json": { schema: ProviderKeySchema } },
    },
    400: jsonErrorResponse("Invalid request"),
    500: jsonErrorResponse("Failed to save provider key"),
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
    return c.json(serializeProviderKey(row, body.apiKey), 201);
  } catch (err) {
    const apiError = toApiError(err);
    if (getStatusCode(err) === 400) {
      return c.json({ error: apiError.error.message }, 400);
    }
    return c.json({ error: apiError.error.message }, 500);
  }
});

// ── Delete a provider key ───────────────────────────────────────────────────

const deleteRoute = createRoute({
  method: "delete",
  path: "/{provider}",
  tags: ["Provider Keys"],
  summary: "Delete the BYOK key for a provider",
  request: { params: z.object({ provider: ProviderEnum }) },
  responses: {
    200: {
      description: "Provider key deleted",
      content: { "application/json": { schema: ProviderKeyDeletedSchema } },
    },
    404: jsonErrorResponse("Not found"),
    500: jsonErrorResponse("Failed to delete provider key"),
  },
});

providerKeyRoutes.openapi(deleteRoute, async (c) => {
  const orgId = c.get("tenant").organizationId as string;
  const provider = c.req.valid("param").provider;
  try {
    // Delete directly and map Prisma's "record not found" (P2025) to 404. This
    // avoids a check-then-delete race between two repository calls.
    await toRepo(orgId).delete(provider);
    return c.json({ deleted: true, provider }, 200);
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
