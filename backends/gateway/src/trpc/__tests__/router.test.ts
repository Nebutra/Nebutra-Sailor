/**
 * tRPC Router Unit Tests
 *
 * Tests backends/gateway/src/trpc/router.ts via the server-side caller:
 *   const caller = trpcRouter.createCaller({ tenant });
 *
 * Procedures under test:
 *   - health.check       (public,  query) → { status: "ok", timestamp }
 *   - billing.getPlans   (public,  query) → 3 plans (FREE / PRO / ENTERPRISE)
 *   - billing.getUsage   (protected, query, input { orgId }) → getUsageSnapshot(orgId)
 *
 * Auth semantics (init.ts): protectedProcedure throws @nebutra/errors
 * UnauthorizedError when tenant.userId is missing; errorMappingMiddleware
 * funnels it through toRpcError → TRPCError with protocol code "UNAUTHORIZED".
 *
 * getUsageSnapshot is mocked so the test never pulls up real Redis / metering.
 */

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/middlewares/usageMetering.js", () => ({
  getUsageSnapshot: vi.fn().mockResolvedValue({ used: 1, limit: 10 }),
}));

import type { TenantContext } from "@/middlewares/tenantContext.js";
import { getUsageSnapshot } from "@/middlewares/usageMetering.js";
import { trpcRouter } from "../router.js";

const mockGetUsageSnapshot = vi.mocked(getUsageSnapshot);

// ---------------------------------------------------------------------------
// Tenant context fixtures
// ---------------------------------------------------------------------------

const anonymousTenant: TenantContext = { plan: "FREE", ip: "127.0.0.1" };

const authedTenant: TenantContext = {
  plan: "FREE",
  ip: "127.0.0.1",
  userId: "u1",
};

beforeEach(() => {
  mockGetUsageSnapshot.mockReset();
  mockGetUsageSnapshot.mockResolvedValue({ used: 1, limit: 10 } as never);
});

// ===========================================================================
// health.check — public
// ===========================================================================

describe("health.check", () => {
  it("returns status 'ok' with a timestamp", async () => {
    const caller = trpcRouter.createCaller({ tenant: anonymousTenant });

    const result = await caller.health.check();

    expect(result.status).toBe("ok");
    expect(result.timestamp).toBeDefined();
    expect(typeof result.timestamp).toBe("string");
    // timestamp is a valid ISO date string
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});

// ===========================================================================
// billing.getPlans — public
// ===========================================================================

describe("billing.getPlans", () => {
  it("returns exactly 3 plans (FREE / PRO / ENTERPRISE)", async () => {
    const caller = trpcRouter.createCaller({ tenant: anonymousTenant });

    const plans = await caller.billing.getPlans();

    expect(plans).toHaveLength(3);
    expect(plans.map((p) => p.slug)).toEqual(["FREE", "PRO", "ENTERPRISE"]);
  });
});

// ===========================================================================
// billing.getUsage — protected
// ===========================================================================

describe("billing.getUsage", () => {
  it("rejects unauthenticated calls with TRPCError code 'UNAUTHORIZED'", async () => {
    const caller = trpcRouter.createCaller({ tenant: anonymousTenant });

    const error = await caller.billing.getUsage({ orgId: "org1" }).catch((e: unknown) => e);

    // The protected procedure rejects with a tRPC-protocol UNAUTHORIZED error,
    // mapped from the domain UnauthorizedError by errorMappingMiddleware.
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe("UNAUTHORIZED");
    // Auth gate short-circuits before the service is ever consulted.
    expect(mockGetUsageSnapshot).not.toHaveBeenCalled();
  });

  it("returns the mocked snapshot and calls getUsageSnapshot with the orgId when authenticated", async () => {
    const snapshot = { used: 1, limit: 10 };
    mockGetUsageSnapshot.mockResolvedValueOnce(snapshot as never);

    const caller = trpcRouter.createCaller({ tenant: authedTenant });

    const result = await caller.billing.getUsage({ orgId: "org1" });

    expect(result).toEqual(snapshot);
    expect(mockGetUsageSnapshot).toHaveBeenCalledOnce();
    expect(mockGetUsageSnapshot).toHaveBeenCalledWith("org1");
  });
});
