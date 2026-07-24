/**
 * API protocol governance tests.
 *
 * Two concerns are covered here:
 *
 *  1. `resolveEnabledProtocols(envSource)` — the env-driven resolver that decides
 *     which of REST / tRPC / oRPC the gateway turns on. It takes its env source as
 *     an argument so it is unit-testable WITHOUT mutating `process.env`.
 *
 *  2. The cross-protocol "parity contract" — tRPC and oRPC must expose the SAME
 *     procedures as REST (`health.check`, `billing.getUsage` [protected],
 *     `billing.getPlans`) and funnel auth failures through `@nebutra/errors` into
 *     the same `UNAUTHORIZED` code via each adapter's error middleware.
 *
 * `billing.getUsage` reaches into `../middlewares/usageMetering.js` →
 * `getUsageSnapshot`, which would otherwise pull up the real Redis/metering
 * client. We mock it so the router exercises its own auth + shape, not infra.
 */

import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/middlewares/usageMetering.js", () => ({
  getUsageSnapshot: vi.fn().mockResolvedValue({ used: 1, limit: 10 }),
}));

import { resolveEnabledProtocols } from "@/config/protocols.js";
import { toRpcError } from "@/lib/rpc-errors.js";
import type { TenantContext } from "@/middlewares/tenantContext.js";
import { getUsageSnapshot } from "@/middlewares/usageMetering.js";
import { orpcRouter } from "@/orpc/router.js";
import { trpcRouter } from "@/trpc/router.js";

const mockGetUsageSnapshot = vi.mocked(getUsageSnapshot);

// A fully-resolved (authenticated) tenant — has a userId, so `protectedProcedure`
// lets it through. Matches the shape the production middleware sets.
const AUTHED_TENANT: TenantContext = {
  userId: "user-123",
  organizationId: "org-456",
  role: "owner",
  plan: "PRO",
  ip: "127.0.0.1",
};

// An anonymous tenant — no userId, so `protectedProcedure` must reject it.
const ANON_TENANT: TenantContext = {
  plan: "FREE",
  ip: "127.0.0.1",
};

beforeEach(() => {
  mockGetUsageSnapshot.mockClear();
  mockGetUsageSnapshot.mockResolvedValue({ used: 1, limit: 10 } as never);
});

// ===========================================================================
// resolveEnabledProtocols — env-driven enablement matrix
// ===========================================================================

describe("resolveEnabledProtocols", () => {
  it("defaults to REST only on an empty env", () => {
    const enabled = resolveEnabledProtocols({});

    expect(enabled.has("rest")).toBe(true);
    expect(enabled.has("trpc")).toBe(false);
    expect(enabled.has("orpc")).toBe(false);
  });

  it("REST is always on even when API_PROTOCOLS omits it", () => {
    const enabled = resolveEnabledProtocols({
      API_PROTOCOLS: "trpc",
    });

    expect(enabled.has("rest")).toBe(true);
    expect(enabled.has("trpc")).toBe(true);
  });

  it('API_PROTOCOLS="rest,trpc" enables rest + trpc but not orpc', () => {
    const enabled = resolveEnabledProtocols({
      API_PROTOCOLS: "rest,trpc",
    });

    expect(enabled.has("rest")).toBe(true);
    expect(enabled.has("trpc")).toBe(true);
    expect(enabled.has("orpc")).toBe(false);
  });

  it("API_PROTOCOLS wins outright — legacy ENABLE_TRPC is ignored once it is set", () => {
    // API_PROTOCOLS hit means the legacy boolean fallback is NOT consulted, so
    // ENABLE_TRPC="true" does NOT sneak trpc in.
    const enabled = resolveEnabledProtocols({
      API_PROTOCOLS: "rest",
      ENABLE_TRPC: "true",
    });

    expect(enabled.has("rest")).toBe(true);
    expect(enabled.has("trpc")).toBe(false);
  });

  it("falls back to legacy ENABLE_TRPC / ENABLE_ORPC when API_PROTOCOLS is absent", () => {
    const enabled = resolveEnabledProtocols({
      ENABLE_TRPC: "true",
      ENABLE_ORPC: "true",
    });

    expect(enabled.has("rest")).toBe(true);
    expect(enabled.has("trpc")).toBe(true);
    expect(enabled.has("orpc")).toBe(true);
  });

  it("accepts NEBUTRA_API_PROTOCOLS as alias when API_PROTOCOLS is unset", () => {
    const enabled = resolveEnabledProtocols({
      NEBUTRA_API_PROTOCOLS: "rest,orpc",
    });

    expect(enabled.has("rest")).toBe(true);
    expect(enabled.has("orpc")).toBe(true);
    expect(enabled.has("trpc")).toBe(false);
  });

  it("prefers API_PROTOCOLS over NEBUTRA_API_PROTOCOLS", () => {
    const enabled = resolveEnabledProtocols({
      API_PROTOCOLS: "rest",
      NEBUTRA_API_PROTOCOLS: "rest,trpc",
    });

    expect(enabled.has("trpc")).toBe(false);
  });

  it("ignores unknown protocol values in the API_PROTOCOLS list", () => {
    const enabled = resolveEnabledProtocols({
      API_PROTOCOLS: "rest,foo",
    });

    expect(enabled.has("rest")).toBe(true);
    expect(enabled.has("trpc")).toBe(false);
    expect(enabled.has("orpc")).toBe(false);
  });

  it("does not mutate the supplied env source", () => {
    const env = { API_PROTOCOLS: "rest,trpc" };
    resolveEnabledProtocols(env);

    expect(env).toEqual({ API_PROTOCOLS: "rest,trpc" });
  });
});

// ===========================================================================
// Cross-protocol parity — tRPC and oRPC expose the same procedures as REST,
// funnelled through the same @nebutra/errors machinery (see lib/rpc-errors.ts).
// ===========================================================================

describe("protocol parity — shared procedure surface", () => {
  it("both RPC routers expose health.check + billing.getUsage + billing.getPlans", () => {
    expect(trpcRouter.health.check).toBeDefined();
    expect(trpcRouter.billing.getUsage).toBeDefined();
    expect(trpcRouter.billing.getPlans).toBeDefined();

    expect(orpcRouter.health.check).toBeDefined();
    expect(orpcRouter.billing.getUsage).toBeDefined();
    expect(orpcRouter.billing.getPlans).toBeDefined();
  });
});

describe("protocol parity — tRPC procedures", () => {
  it("health.check is public and returns an ok status", async () => {
    const caller = trpcRouter.createCaller({ tenant: ANON_TENANT });
    const result = await caller.health.check();

    expect(result.status).toBe("ok");
  });

  it("billing.getPlans is public and returns the plan catalogue", async () => {
    const caller = trpcRouter.createCaller({ tenant: ANON_TENANT });
    const plans = await caller.billing.getPlans();

    expect(plans.map((p) => p.slug)).toEqual(["FREE", "PRO", "ENTERPRISE"]);
  });

  it("billing.getUsage [protected] resolves for an authenticated tenant", async () => {
    const caller = trpcRouter.createCaller({ tenant: AUTHED_TENANT });
    const usage = await caller.billing.getUsage({ orgId: "org-456" });

    expect(usage).toEqual({ used: 1, limit: 10 });
    expect(mockGetUsageSnapshot).toHaveBeenCalledWith("org-456");
  });

  it("billing.getUsage [protected] funnels an anonymous tenant to a UNAUTHORIZED envelope", async () => {
    // tRPC wraps the thrown domain `UnauthorizedError` into a `TRPCError` at the
    // procedure boundary (`TRPCError.code` is the generic INTERNAL_SERVER_ERROR),
    // and keeps the original domain error on `error.cause`. The gateway's
    // `errorFormatter` in src/trpc/init.ts then runs `toRpcError(error.cause)` to
    // attach the SAME canonical `@nebutra/errors` envelope REST/oRPC clients get.
    // We assert on that funnelled envelope — the body the client actually sees.
    const caller = trpcRouter.createCaller({ tenant: ANON_TENANT });

    const error = await caller.billing.getUsage({ orgId: "org-456" }).then(
      () => {
        throw new Error("expected billing.getUsage to reject for an anonymous tenant");
      },
      (e: { name: string; cause?: unknown }) => e,
    );

    expect(error.name).toBe("TRPCError");
    expect(error.cause).toBeDefined();

    const funnelled = toRpcError(error.cause ?? error);
    expect(funnelled.code).toBe("UNAUTHORIZED");
    expect(funnelled.status).toBe(401);
    expect(funnelled.api.error.code).toBe("UNAUTHORIZED");

    // Auth gate short-circuits before the service is ever consulted.
    expect(mockGetUsageSnapshot).not.toHaveBeenCalled();
  });
});

describe("protocol parity — oRPC procedures", () => {
  it("health.check is public and returns an ok status", async () => {
    const result = await call(orpcRouter.health.check, undefined, {
      context: { tenant: ANON_TENANT },
    });

    expect(result.status).toBe("ok");
  });

  it("billing.getPlans is public and returns the plan catalogue", async () => {
    const plans = await call(orpcRouter.billing.getPlans, undefined, {
      context: { tenant: ANON_TENANT },
    });

    expect(plans.map((p) => p.slug)).toEqual(["FREE", "PRO", "ENTERPRISE"]);
  });

  it("billing.getUsage [protected] resolves for an authenticated tenant", async () => {
    const usage = await call(
      orpcRouter.billing.getUsage,
      { orgId: "org-456" },
      { context: { tenant: AUTHED_TENANT } },
    );

    expect(usage).toEqual({ used: 1, limit: 10 });
    expect(mockGetUsageSnapshot).toHaveBeenCalledWith("org-456");
  });

  it("billing.getUsage [protected] rejects an anonymous tenant with code UNAUTHORIZED", async () => {
    // oRPC's `guarded` middleware maps the domain `UnauthorizedError` through
    // `toRpcError` into an `ORPCError` whose `code` + `status` ARE the canonical
    // values directly — no formatter indirection needed (see src/orpc/init.ts).
    await expect(
      call(orpcRouter.billing.getUsage, { orgId: "org-456" }, { context: { tenant: ANON_TENANT } }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    expect(mockGetUsageSnapshot).not.toHaveBeenCalled();
  });
});
