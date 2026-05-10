import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { tenantContextMiddleware } from "../middlewares/tenantContext.js";
import { trpcRouter } from "./router.js";

export const trpcApp = new Hono();

trpcApp.use("*", tenantContextMiddleware);

trpcApp.all("/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: trpcRouter,
    createContext: () => ({ tenant: c.get("tenant") }),
  });
});
