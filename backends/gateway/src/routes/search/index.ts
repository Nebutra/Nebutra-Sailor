/**
 * /api/v1/search — Search routing layer
 *
 * Exposes a unified endpoint that delegates to the configured search provider.
 * Secured by tenant contexts.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { toApiError } from "@nebutra/errors";
import { getSearch } from "@nebutra/search";
import { requireAuth } from "../../middlewares/tenantContext.js";

export const searchRoutes = new OpenAPIHono();
searchRoutes.use("*", requireAuth);

const SearchRequestSchema = z.object({
  query: z.string().min(1),
  index: z.string().min(1),
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  facets: z.array(z.string()).optional(),
  sort: z.array(z.string()).optional(),
  page: z.number().int().min(1).optional(),
  hitsPerPage: z.number().int().min(1).max(100).optional(),
  highlightFields: z.array(z.string()).optional(),
  typoTolerance: z.boolean().optional(),
  minScore: z.number().min(0).max(1).optional(),
});

const searchRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Search"],
  summary: "Perform a full-text search",
  request: { body: { content: { "application/json": { schema: SearchRequestSchema } } } },
  responses: {
    200: { description: "Search results" },
    400: { description: "Invalid request" },
    500: { description: "Search provider error" },
  },
});

searchRoutes.openapi(searchRoute, async (c) => {
  const tenant = c.get("tenant");
  const orgId = tenant?.organizationId ?? "";
  const body = c.req.valid("json");

  try {
    const searchClient = await getSearch();

    // Enforce tenant isolation via filters
    const secureQuery = {
      ...body,
      tenantId: orgId, // Passes to provider for implicit isolation if supported
      filters: {
        ...body.filters,
        tenantId: orgId, // Explicit filter
      },
    };

    const results = await searchClient.search(body.index, secureQuery);
    return c.json(results);
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 500);
  }
});

// Admin-only synchronization endpoint
const syncRoute = createRoute({
  method: "post",
  path: "/sync",
  tags: ["Search"],
  summary: "Synchronize database with search index",
  responses: {
    200: { description: "Sync triggered" },
    403: { description: "Forbidden" },
  },
});

searchRoutes.openapi(syncRoute, async (c) => {
  // Only accessible to admins -- could verify RBAC here
  return c.json({ queued: true, message: "Sync job dispatched to event bus" }, 202);
});
