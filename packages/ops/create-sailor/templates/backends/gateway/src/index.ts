import { serve } from "@hono/node-server";
import { Hono } from "hono";

// import { tenantMiddleware } from "@nebutra/tenant/middleware";
// import { fromHeader } from "@nebutra/tenant/resolvers";

const app = new Hono();

// app.use("*", tenantMiddleware({ resolvers: [fromHeader("x-tenant-id")] }));

app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT ?? 8080);
serve({ fetch: app.fetch, port });

export default app;
