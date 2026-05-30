/**
 * oRPC Router Unit Tests
 *
 * Exercises backends/gateway/src/orpc/router.ts via the `@orpc/server` `call`
 * helper. Each procedure is invoked with an explicit tenant context, mirroring
 * how the fetch adapter wires `{ tenant }` from `tenantContextMiddleware`.
 *
 * `../middlewares/usageMetering.js` is mocked so `billing.getUsage` never pulls
 * up real metering/Redis — it resolves a deterministic snapshot and lets us
 * assert the procedure forwarded the validated `orgId` input.
 *
 * Auth semantics: `protectedProcedure` throws `@nebutra/errors` `UnauthorizedError`
 * when `tenant.userId` is missing; the `init.ts` error middleware converts that
 * into an `ORPCError` with protocol code `"UNAUTHORIZED"`.
 */

import { call, ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/middlewares/usageMetering.js", () => ({
  getUsageSnapshot: vi.fn().mockResolvedValue({ used: 1, limit: 10 }),
}));

import { getUsageSnapshot } from "@/middlewares/usageMetering.js";
import type { TenantContext } from "../../middlewares/tenantContext.js";
import { orpcRouter } from "../router.js";

const mockGetUsageSnapshot = vi.mocked(getUsageSnapshot);

// ---------------------------------------------------------------------------
// Tenant context fixtures
// ---------------------------------------------------------------------------

const anonymousTenant: TenantContext = {
  plan: "FREE",
  ip: "127.0.0.1",
};

const authenticatedTenant: TenantContext = {
  plan: "FREE",
  ip: "127.0.0.1",
  userId: "u1",
  organizationId: "org1",
  role: "org:member",
};

beforeEach(() => {
  mockGetUsageSnapshot.mockReset();
  mockGetUsageSnapshot.mockResolvedValue({ used: 1, limit: 10 } as never);
});

// ===========================================================================
// health.check — public
// ===========================================================================

describe("orpcRouter.health.check", () => {
  it('returns status "ok"', async () => {
    const result = await call(
      orpcRouter.health.check,
      {},
      { context: { tenant: anonymousTenant } },
    );

    expect(result.status).toBe("ok");
    expect(typeof result.timestamp).toBe("string");
  });
});

// ===========================================================================
// billing.getPlans — public
// ===========================================================================

describe("orpcRouter.billing.getPlans", () => {
  it("returns 3 plan entries", async () => {
    const plans = await call(
      orpcRouter.billing.getPlans,
      {},
      { context: { tenant: anonymousTenant } },
    );

    expect(plans).toHaveLength(3);
    expect(plans.map((p) => p.slug)).toEqual(["FREE", "PRO", "ENTERPRISE"]);
  });
});

// ===========================================================================
// billing.getUsage — protected
// ===========================================================================

describe("orpcRouter.billing.getUsage", () => {
  it('rejects unauthenticated callers with code "UNAUTHORIZED"', async () => {
    await expect(
      call(
        orpcRouter.billing.getUsage,
        { orgId: "org1" },
        { context: { tenant: anonymousTenant } },
      ),
    ).rejects.toSatisfy((error) => {
      expect(error).toBeInstanceOf(ORPCError);
      expect((error as ORPCError<string, unknown>).code).toBe("UNAUTHORIZED");
      return true;
    });

    expect(mockGetUsageSnapshot).not.toHaveBeenCalled();
  });

  it("returns the mock snapshot and calls getUsageSnapshot with the input orgId when authenticated", async () => {
    const result = await call(
      orpcRouter.billing.getUsage,
      { orgId: "org1" },
      { context: { tenant: authenticatedTenant } },
    );

    expect(result).toEqual({ used: 1, limit: 10 });
    expect(mockGetUsageSnapshot).toHaveBeenCalledOnce();
    expect(mockGetUsageSnapshot).toHaveBeenCalledWith("org1");
  });
});
