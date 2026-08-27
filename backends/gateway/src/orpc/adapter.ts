import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { tenantContextMiddleware } from "../middlewares/tenantContext.js";
import { orpcRouter } from "./router.js";

const handler = new RPCHandler(orpcRouter);

export const orpcApp = new Hono();

orpcApp.use("*", tenantContextMiddleware);

orpcApp.all("/*", async (c) => {
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: "/api/rpc",
    context: { tenant: c.get("tenant") },
  });

  if (matched) {
    return response;
  }

  return c.json({ error: "Not found" }, 404);
});
