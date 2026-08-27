import { isPlanFeature, requireEntitlementUsage } from "@nebutra/billing";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireFeature } from "@/middlewares/entitlements.js";
import type { TenantContext } from "@/middlewares/tenantContext.js";

vi.mock("@nebutra/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@nebutra/billing", () => ({
  isPlanFeature: vi.fn(),
  requireEntitlementUsage: vi.fn(),
}));

const isPlanFeatureMock = vi.mocked(isPlanFeature);
const requireEntitlementUsageMock = vi.mocked(requireEntitlementUsage);

function makeApp(tenant: TenantContext | undefined, feature: string, quantity?: number) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    if (tenant) {
      c.set("tenant", tenant);
    }
    await next();
  });
  app.get("/protected", requireFeature(feature, quantity), (c) => c.json({ ok: true }));
  return app;
}

async function requestJson(app: Hono) {
  const response = await app.request("/protected", { method: "GET" });
  return {
    response,
    body: await response.json(),
  };
}

describe("requireFeature", () => {
  const proTenant: TenantContext = {
    organizationId: "org_1",
    tenantId: "org_1",
    tenantKind: "organization",
    userId: "user_1",
    role: "org:admin",
    plan: "PRO",
    ip: "127.0.0.1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    isPlanFeatureMock.mockReturnValue(true);
    requireEntitlementUsageMock.mockResolvedValue(undefined);
  });

  it("requires organization membership before checking billing", async () => {
    const { response, body } = await requestJson(makeApp(undefined, "ai.images", 1));

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      error: "Forbidden",
      message: "Organization membership required to access this feature",
    });
    expect(isPlanFeatureMock).not.toHaveBeenCalled();
    expect(requireEntitlementUsageMock).not.toHaveBeenCalled();
  });

  it("blocks features that are not included in the tenant plan", async () => {
    isPlanFeatureMock.mockReturnValue(false);

    const { response, body } = await requestJson(makeApp(proTenant, "sso", 1));

    expect(response.status).toBe(402);
    expect(body).toMatchObject({
      code: "ENTITLEMENT_DENIED",
    });
    expect(isPlanFeatureMock).toHaveBeenCalledWith("PRO", "sso");
    expect(requireEntitlementUsageMock).not.toHaveBeenCalled();
  });

  it("allows unmetered features included in the tenant plan", async () => {
    const { response, body } = await requestJson(makeApp(proTenant, "webhooks"));

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(isPlanFeatureMock).toHaveBeenCalledWith("PRO", "webhooks");
    expect(requireEntitlementUsageMock).not.toHaveBeenCalled();
  });

  it("checks metered feature quota before allowing the request", async () => {
    const { response, body } = await requestJson(makeApp(proTenant, "ai.images", 42));

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(requireEntitlementUsageMock).toHaveBeenCalledWith("org_1", "ai_tokens", "PRO", {
      requested: 42,
    });
  });

  it("normalizes unknown plan values to FREE before entitlement checks", async () => {
    const tenant: TenantContext = { ...proTenant, plan: "trial" };

    await requestJson(makeApp(tenant, "ai.chat", 5));

    expect(isPlanFeatureMock).toHaveBeenCalledWith("FREE", "ai.chat");
    expect(requireEntitlementUsageMock).toHaveBeenCalledWith("org_1", "ai_tokens", "FREE", {
      requested: 5,
    });
  });

  it("returns 402 when quota checks fail", async () => {
    requireEntitlementUsageMock.mockRejectedValue(
      Object.assign(new Error("ai_tokens limit exceeded (10050/10000)"), {
        name: "EntitlementError",
        code: "USAGE_LIMIT_EXCEEDED",
      }),
    );

    const { response, body } = await requestJson(makeApp(proTenant, "ai.chat", 100));

    expect(response.status).toBe(402);
    expect(body).toMatchObject({
      code: "USAGE_LIMIT_EXCEEDED",
      message: "ai_tokens limit exceeded (10050/10000)",
    });
  });
});
