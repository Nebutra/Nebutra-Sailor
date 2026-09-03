/**
 * Regression: the gateway's request-scoped tenant is visible through
 * @nebutra/tenant's AsyncLocalStorage primitive, not just via the Hono
 * `Context` (`c.get("tenant")`).
 *
 * `backends/gateway/src/middlewares/tenantContext.ts` is the production
 * tenant path — it verifies the S2S HMAC / Bearer JWT and builds the
 * gateway's own `TenantContext` shape, then sets `c.set("tenant", …)` for
 * every existing guard (`requireAuth`, `requireTenant`, `requireOrganization`,
 * `requireRole`) and for `tenantToPermissionContext`. None of that changes
 * here. What's new: once a canonical `tenantId` is resolved, the middleware
 * also runs the rest of the request inside `@nebutra/tenant`'s
 * `runWithTenant()`, so any downstream module — a route handler, a service,
 * a repository — can call `getCurrentTenant()` / `getCurrentTenantId()`
 * without threading the Hono `Context` through every call site.
 *
 * Before this PR, @nebutra/tenant had zero importers in the gateway:
 * `getCurrentTenant()` called from inside a route handler always threw
 * `TenantRequiredError`, even for a fully authenticated, tenant-resolved
 * request — this file's first test fails against that behaviour (verified by
 * running it against the pre-change middleware; see the PR description).
 */

import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { s2sHeaders, TEST_SERVICE_SECRET } from "./helpers/s2s-token.js";

vi.mock("@nebutra/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// tenantContext imports the auth provider factory statically. It is only
// invoked for Bearer tokens, which this suite never sends; mocking it keeps
// the provider SDKs out of the module graph (same rationale as
// __tests__/degradation.test.ts).
vi.mock("@nebutra/auth/server", () => ({
  createAuth: vi.fn(),
}));

import { getCurrentTenantId, getTenantOrNull } from "@nebutra/tenant";
import { tenantContextMiddleware } from "@/middlewares/tenantContext.js";

function buildApp() {
  const app = new Hono();
  app.use("*", tenantContextMiddleware);
  app.get("/whoami", (c) => {
    // The route handler never reads `c.get("tenant")` here — it goes
    // straight through @nebutra/tenant's context primitive, proving the
    // gateway actually publishes into it rather than only its own Context.
    return c.json({ tenantId: getCurrentTenantId() });
  });
  app.get("/whoami-or-null", (c) => {
    return c.json({ tenant: getTenantOrNull() });
  });
  return app;
}

beforeEach(() => {
  vi.stubEnv("SERVICE_SECRET", TEST_SERVICE_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("gateway tenant context primitive (@nebutra/tenant)", () => {
  it("is visible via getCurrentTenantId() inside a route handler for a resolved tenant", async () => {
    const app = buildApp();
    const res = await app.request("/whoami", {
      method: "GET",
      headers: await s2sHeaders({
        userId: "user_primitive",
        orgId: "org_primitive",
        role: "org:member",
        plan: "PRO",
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tenantId: "org_primitive" });
  });

  it("stays null for an unauthenticated request — no tenant context is fabricated", async () => {
    const app = buildApp();
    const res = await app.request("/whoami-or-null", { method: "GET" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tenant: null });
  });
});
