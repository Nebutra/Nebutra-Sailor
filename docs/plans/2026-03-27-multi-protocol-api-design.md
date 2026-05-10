# Multi-Protocol API Architecture — Design Document

**Date:** 2026-03-27
**Goal:** Let Sailor's API gateway serve REST/OpenAPI + oRPC + optional tRPC from a single Hono server, sharing contracts and middleware. Users enable protocols via preset config.

---

## Architecture

```
backends/gateway/src/
  index.ts                    ← Hono HTTP server (unchanged entry)
  routes/                     ← REST/OpenAPI routes (existing, unchanged)
  orpc/
    router.ts                 ← oRPC root router
    procedures/               ← oRPC procedures (reuse @nebutra/contracts)
    adapter.ts                ← Hono middleware adapter for /api/rpc/*
  trpc/
    router.ts                 ← tRPC root router
    procedures/               ← tRPC procedures (reuse @nebutra/contracts)
    adapter.ts                ← Hono middleware adapter for /api/trpc/*

packages/
  contracts/src/              ← Shared Zod schemas (existing, unchanged)
    billing.ts                  Used by REST routes, oRPC, AND tRPC
    identity.ts
    events.ts
```

### Protocol mounting in index.ts

```ts
// Existing REST routes (always enabled)
app.route("/api/v1/billing", billingRoutes);
app.route("/api/v1/events", eventRoutes);

// oRPC (enabled when apiProtocols includes "orpc")
if (config.apiProtocols.includes("orpc")) {
  const { orpcAdapter } = await import("./orpc/adapter.js");
  app.route("/api/rpc", orpcAdapter);
}

// tRPC (enabled when apiProtocols includes "trpc")
if (config.apiProtocols.includes("trpc")) {
  const { trpcAdapter } = await import("./trpc/adapter.js");
  app.route("/api/trpc", trpcAdapter);
}
```

Dynamic imports ensure unused protocols add zero bundle weight.

---

## Preset Config Extension

```ts
// packages/preset/src/config.ts
export const ApiProtocolId = z.enum(["rest", "orpc", "trpc"]);

// Add to NebutraConfigSchema
apiProtocols: z.array(ApiProtocolId).default(["rest"]),
```

Users configure in their preset:
```ts
defineConfig({
  preset: "standard",
  apiProtocols: ["rest", "orpc"],  // REST always on, add oRPC
})
```

---

## oRPC Implementation

### Dependencies
- `@orpc/server` — server-side procedure definitions
- `@orpc/openapi` — OpenAPI spec generation from procedures
- `@orpc/zod` — Zod schema integration (native)

### Router pattern
```ts
// orpc/router.ts
import { os } from "@orpc/server";
import { BillingContractSchema } from "@nebutra/contracts";

const billing = os.router({
  getUsage: os
    .input(z.object({ orgId: z.string() }))
    .output(UsageSnapshotSchema)
    .handler(async ({ input, context }) => {
      return getUsageSnapshot(input.orgId);
    }),

  createCheckout: os
    .input(CreateCheckoutSchema)
    .output(CheckoutResponseSchema)
    .handler(async ({ input, context }) => {
      // reuse existing billing service logic
    }),
});

export const orpcRouter = os.router({ billing, events, ai });
```

### Hono adapter
```ts
// orpc/adapter.ts
import { RPCHandler } from "@orpc/server/fetch";
import { orpcRouter } from "./router.js";

const handler = new RPCHandler(orpcRouter);

export const orpcAdapter = new Hono()
  .use("*", tenantContextMiddleware)
  .all("/*", async (c) => {
    const response = await handler.handle(c.req.raw, {
      context: { tenant: c.get("tenant") },
    });
    return response ?? c.json({ error: "Not found" }, 404);
  });
```

### Client generation
oRPC auto-generates a type-safe client:
```ts
// apps/web usage
import { createORPCClient } from "@orpc/client";
import type { orpcRouter } from "@nebutra/api-gateway/orpc";

const client = createORPCClient<typeof orpcRouter>({
  baseURL: "/api/rpc",
});

const usage = await client.billing.getUsage({ orgId: "org-123" });
//                  ^ fully typed, no codegen needed
```

---

## tRPC Implementation (Optional)

### Dependencies
- `@trpc/server` — server-side router
- `@trpc/client` — client-side caller
- `@trpc/server/adapters/fetch` — Hono-compatible fetch adapter

### Router pattern
```ts
// trpc/router.ts
import { initTRPC } from "@trpc/server";
import { BillingContractSchema } from "@nebutra/contracts";

const t = initTRPC.context<TrpcContext>().create();

export const trpcRouter = t.router({
  billing: t.router({
    getUsage: t.procedure
      .input(z.object({ orgId: z.string() }))
      .query(async ({ input, ctx }) => {
        return getUsageSnapshot(input.orgId);
      }),
  }),
});

export type TrpcRouter = typeof trpcRouter;
```

### Hono adapter
```ts
// trpc/adapter.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { trpcRouter } from "./router.js";

export const trpcAdapter = new Hono()
  .use("*", tenantContextMiddleware)
  .all("/*", async (c) => {
    return fetchRequestHandler({
      endpoint: "/api/trpc",
      req: c.req.raw,
      router: trpcRouter,
      createContext: () => ({ tenant: c.get("tenant") }),
    });
  });
```

---

## Shared Middleware

All three protocols share the same middleware stack because they all mount through Hono:

- Tenant context (auth extraction)
- Rate limiting
- Audit logging
- Usage metering
- Request tracing (OTel)

No middleware duplication needed.

---

## Contract Sharing

The key architectural advantage: `@nebutra/contracts` Zod schemas are the single source of truth.

| Protocol | How it uses contracts |
|----------|----------------------|
| REST/OpenAPI | `@hono/zod-openapi` createRoute() |
| oRPC | `os.input(schema).output(schema)` — native Zod |
| tRPC | `t.procedure.input(schema)` — native Zod |

All three consume the exact same Zod objects. Change a contract once, all protocols update.

---

## OpenAPI Spec

REST routes already generate OpenAPI at `/openapi.json`. oRPC can also generate an OpenAPI spec via `@orpc/openapi`:

```ts
import { OpenAPIGenerator } from "@orpc/openapi";
const spec = new OpenAPIGenerator({ router: orpcRouter }).generate({
  info: { title: "Nebutra RPC API", version: "1.0" },
});
```

This means the gateway can serve TWO OpenAPI specs:
- `/openapi.json` — REST routes (existing)
- `/api/rpc/openapi.json` — oRPC-generated spec

---

## Graceful Degradation

| Config | What runs | Bundle impact |
|--------|-----------|---------------|
| `["rest"]` (default) | Hono + REST only | Zero — no oRPC/tRPC imported |
| `["rest", "orpc"]` | Hono + REST + oRPC | +~40KB (orpc server) |
| `["rest", "orpc", "trpc"]` | All three | +~80KB total |

Dynamic `import()` ensures unused protocols are never loaded.

---

## Testing

- REST routes: existing integration tests (unchanged)
- oRPC procedures: new test file `orpc/__tests__/procedures.test.ts` — test via oRPC test client
- tRPC procedures: new test file `trpc/__tests__/procedures.test.ts` — test via tRPC caller
- Architecture test: add to `tests/architecture/api-contract.test.ts` — verify oRPC/tRPC routers export correct types

---

## Implementation Phases

1. **Phase 1: Preset config** — Add `apiProtocols` to config schema
2. **Phase 2: oRPC** — Create router, procedures, adapter, mount in index.ts
3. **Phase 3: tRPC** — Create router, procedures, adapter, mount in index.ts
4. **Phase 4: Client helpers** — Export typed clients for web app consumption
5. **Phase 5: Tests** — Procedure tests + architecture test update

---

## Out of Scope

- gRPC — too heavy for SaaS template target audience, add later if demand exists
- GraphQL — declining in SaaS context, not worth the complexity
- WebSocket RPC — handle via existing Hono websocket adapter if needed
