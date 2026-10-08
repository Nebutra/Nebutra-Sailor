/** Authenticated BYOK APIs and KCQ V1 proxy. No shared-provider fallback. */
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { logger } from "@nebutra/logger";
import { bodyLimit } from "hono/body-limit";
import { mapTenantRoleToPermissionRoles } from "../../middlewares/tenantContext.js";
import { type MarketScope, resolveMarketScope } from "./scope.js";
import { type ConnectionStore, connectionStore } from "./store.js";
import { barRequest, MarketSourceError, TwelveDataAdapter } from "./twelve-data.js";

interface Options {
  resolveScope?: (request: Request) => Promise<MarketScope | null>;
  store?: ConnectionStore;
  adapter?: Pick<TwelveDataAdapter, "probe" | "search" | "bars">;
}
const credentialsSchema = z.object({
  id: z.string().min(1).max(160).optional(),
  label: z.string().trim().min(1).max(64),
  apiKey: z
    .string()
    .trim()
    .min(8)
    .max(256)
    .regex(/^[A-Za-z0-9_-]+$/),
});
const metadataSchema = z.object({
  id: z.string(),
  provider: z.string(),
  label: z.string(),
  maskedKey: z.string(),
  updatedAt: z.string(),
});
const searchRequest = z.object({
  sourceId: z.string(),
  keyword: z.string().trim().min(1).max(80),
  limit: z.number().int().min(1).max(50),
  assetClasses: z.array(z.string()).optional(),
});

export function createKcqRoutes(options: Options = {}) {
  const app = new OpenAPIHono<{ Variables: { marketScope: MarketScope } }>();
  const store = options.store ?? connectionStore;
  const adapter = options.adapter ?? new TwelveDataAdapter();
  const resolveScope = options.resolveScope ?? resolveMarketScope;
  app.use("*", bodyLimit({ maxSize: 16384 }));
  app.use("*", async (c, next) => {
    c.header("Cache-Control", "private, no-store");
    const scope = await resolveScope(c.req.raw);
    if (!scope)
      return c.json(
        {
          error: { code: "FETCH_FAILED", message: "请先登录 Nebutra。" },
          requestId: crypto.randomUUID(),
        },
        401,
      );
    if (c.req.method !== "GET") {
      const allowed = new Set<string>();
      if (process.env.KCQ_PUBLIC_ORIGIN) allowed.add(process.env.KCQ_PUBLIC_ORIGIN);
      if (process.env.NODE_ENV !== "production") allowed.add("http://localhost:3130");
      if (!allowed.has(c.req.header("Origin") ?? ""))
        return c.json({ error: { code: "FETCH_FAILED", message: "请求来源无效。" } }, 403);
    }
    // Credential writes require the verified scope's administrative capability.
    // Market-data POSTs only consume a connection owned by that same scope.
    const writesCredentials =
      c.req.method !== "GET" && !c.req.path.includes("/api/v1/market-data/");
    if (writesCredentials) {
      const roles = mapTenantRoleToPermissionRoles(scope.canManage ? "admin" : "viewer");
      if (!roles.includes("admin"))
        throw new MarketSourceError(403, "只有工作区管理员可以修改 Key。");
    }
    c.set("marketScope", scope);
    await next();
  });
  app.onError((error, c) => {
    const requestId = crypto.randomUUID();
    if (!(error instanceof MarketSourceError)) {
      const code = Object.getOwnPropertyDescriptor(error, "code")?.value;
      logger.error("KCQ market request failed", {
        requestId,
        category: error instanceof TypeError ? "TypeError" : "Error",
        databaseCode: typeof code === "string" && /^P\d{4}$/.test(code) ? code : undefined,
        frame: error.stack
          ?.split("\n")
          .slice(1)
          .join("\n")
          .match(/\/app\/[A-Za-z0-9_./@+-]+:\d+:\d+/)?.[0],
      });
    }
    const source =
      error instanceof MarketSourceError
        ? error
        : new MarketSourceError(503, "数据源服务暂不可用，请稍后重试。");
    return c.json(
      { error: { code: source.code, message: source.message }, requestId },
      source.status,
    );
  });
  app.openapi(
    createRoute({
      method: "get",
      path: "/connections",
      tags: ["KCQ"],
      summary: "List masked workspace market connections",
      responses: {
        200: {
          description: "Masked connections",
          content: {
            "application/json": {
              schema: z.object({ connections: z.array(metadataSchema), canManage: z.boolean() }),
            },
          },
        },
      },
    }),
    async (c) => {
      const scope = c.get("marketScope");
      return c.json(
        { connections: await store.list(scope.tenantId), canManage: scope.canManage },
        200,
      );
    },
  );
  app.openapi(
    createRoute({
      method: "post",
      path: "/connections",
      tags: ["KCQ"],
      summary: "Store or replace an encrypted customer market key",
      request: {
        body: { required: true, content: { "application/json": { schema: credentialsSchema } } },
      },
      responses: {
        200: {
          description: "Masked connection",
          content: { "application/json": { schema: metadataSchema } },
        },
      },
    }),
    async (c) => {
      const scope = c.get("marketScope");
      return c.json(await store.save(scope.tenantId, c.req.valid("json")), 200);
    },
  );
  app.delete("/connections/:id", async (c) => {
    const scope = c.get("marketScope");
    if (!(await store.remove(scope.tenantId, c.req.param("id"))))
      throw new MarketSourceError(404, "连接不存在。");
    return c.body(null, 204);
  });
  app.all("/connections/:id/api/v1/market-data/*", async (c) => {
    const scope = c.get("marketScope");
    const id = c.req.param("id");
    const sourceId = `byok-${id}`;
    const connection = await store.find(scope.tenantId, id);
    if (!connection) throw new MarketSourceError(404, "连接不存在。");
    const path = c.req.path.split("/api/v1/market-data/")[1];
    let data: unknown;
    if (c.req.method === "GET" && path === `sources/${sourceId}/probe`) {
      data = await adapter.probe(connection.key);
    } else if (c.req.method === "POST" && path === "instruments/search") {
      const parsed = searchRequest.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success || parsed.data.sourceId !== sourceId)
        throw new MarketSourceError(400, "行情搜索参数无效。");
      data = await adapter.search(connection.key, sourceId, parsed.data.keyword, parsed.data.limit);
    } else if (c.req.method === "POST" && path === "bars") {
      const parsed = barRequest.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success || parsed.data.sourceId !== sourceId)
        throw new MarketSourceError(400, "K 线参数无效。");
      data = await adapter.bars(connection.key, parsed.data);
    } else {
      throw new MarketSourceError(400, "行情源不支持此能力。", "UNSUPPORTED_CAPABILITY");
    }
    return c.json({ data, requestId: crypto.randomUUID() });
  });
  return app;
}
export const kcqRoutes = createKcqRoutes();
