import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getSystemDb } from "@nebutra/db";
import { PresetCodeError, parsePreset } from "@nebutra/tokens/preset";
import { resolveCallerUserId as callerId } from "../../lib/caller-identity.js";

/**
 * Sailor Studio presets saved to a person's account — the sync half of the
 * agent loop: `nebutra studio preview` (logged in) saves what the agent
 * proposed, Studio lists it under "Your presets", and either side opens the
 * other's latest without a link being copied.
 *
 * Personal data, not tenant data: the table is `@rls deny` and every query
 * here filters on the caller's user id.
 */

const LIST_LIMIT = 30;

type StudioEnv = { Variables: { tenant?: { userId?: string } } };
export const studioPresetRoutes = new OpenAPIHono<StudioEnv>();

const presetSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    source: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("StudioPreset");

const errorSchema = z.object({ error: z.string() });

const toJson = (p: {
  id: string;
  name: string;
  code: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: p.id,
  name: p.name,
  code: p.code,
  source: p.source,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

const listRoute = createRoute({
  method: "get",
  path: "/presets",
  tags: ["Studio"],
  summary: "List your saved Sailor Studio presets, newest first",
  responses: {
    200: {
      description: "Presets",
      content: { "application/json": { schema: z.object({ presets: z.array(presetSchema) }) } },
    },
    401: { description: "Not signed in", content: { "application/json": { schema: errorSchema } } },
  },
});

studioPresetRoutes.openapi(listRoute, async (c) => {
  const userId = await callerId(c);
  if (!userId) return c.json({ error: "Sign in to see your presets" }, 401);
  // AUDIT(no-tenant): personal presets (@rls deny); filtered on the caller's user id.
  const presets = await getSystemDb().studioPreset.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: LIST_LIMIT,
  });
  return c.json({ presets: presets.map(toJson) }, 200);
});

/** "Linear · Sep 29": the look's language and the day it was saved. */
function defaultName(base: string): string {
  const day = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${base.charAt(0).toUpperCase()}${base.slice(1)} · ${day}`;
}

const saveBody = z.object({
  code: z.string().min(1).max(32),
  name: z.string().trim().min(1).max(80).optional(),
  source: z.string().trim().min(1).max(40).optional(),
});

const saveRoute = createRoute({
  method: "post",
  path: "/presets",
  tags: ["Studio"],
  summary: "Save a Sailor Studio preset to your account",
  request: { body: { content: { "application/json": { schema: saveBody } } } },
  responses: {
    201: {
      description: "Saved",
      content: { "application/json": { schema: z.object({ preset: presetSchema }) } },
    },
    400: { description: "Not a preset", content: { "application/json": { schema: errorSchema } } },
    401: { description: "Not signed in", content: { "application/json": { schema: errorSchema } } },
  },
});

studioPresetRoutes.openapi(saveRoute, async (c) => {
  const userId = await callerId(c);
  if (!userId) return c.json({ error: "Sign in to save presets" }, 401);
  const body = c.req.valid("json");
  let base: string;
  try {
    base = parsePreset(body.code).base;
  } catch (error) {
    const message = error instanceof PresetCodeError ? error.message : "Not a preset code";
    return c.json({ error: message }, 400);
  }
  const source = body.source ?? "web";
  // AUDIT(no-tenant): personal presets (@rls deny); written for the caller only.
  const preset = await getSystemDb().studioPreset.create({
    data: { userId, code: body.code, source, name: body.name ?? defaultName(base) },
  });
  return c.json({ preset: toJson(preset) }, 201);
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/presets/{id}",
  tags: ["Studio"],
  summary: "Delete one of your saved presets",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Deleted",
      content: { "application/json": { schema: z.object({ deleted: z.boolean() }) } },
    },
    401: { description: "Not signed in", content: { "application/json": { schema: errorSchema } } },
  },
});

studioPresetRoutes.openapi(deleteRoute, async (c) => {
  const userId = await callerId(c);
  if (!userId) return c.json({ error: "Sign in to delete presets" }, 401);
  const { id } = c.req.valid("param");
  // AUDIT(no-tenant): personal presets (@rls deny); the where clause scopes it to the caller.
  const result = await getSystemDb().studioPreset.deleteMany({ where: { id, userId } });
  return c.json({ deleted: result.count > 0 }, 200);
});
