import { Hono } from "hono";

// import { tenantMiddleware } from "@nebutra/tenant/middleware";
// import { fromHeader } from "@nebutra/tenant/resolvers";

const app = new Hono();

// app.use("*", tenantMiddleware({ resolvers: [fromHeader("x-tenant-id")] }));

app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
