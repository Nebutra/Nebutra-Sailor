import { OpenAPIHono } from "@hono/zod-openapi";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ADMIN_KEY = "test-admin-key-that-is-at-least-32-chars";
const mockLoggerInfo = vi.fn();
const { refundPaymentOrderMock } = vi.hoisted(() => ({ refundPaymentOrderMock: vi.fn() }));

vi.mock("@nebutra/billing", async () => {
  const { BillingError } = await import("../../../../../packages/commerce/billing/src/types.js");
  return {
    BillingError,
    refundPaymentOrder: (input: unknown) => refundPaymentOrderMock(input),
  };
});

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => ({}),
}));

vi.mock("@nebutra/event-bus", () => ({
  ackDeadLetter: vi.fn(),
  getDeadLetterQueue: vi.fn(() => []),
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    info: mockLoggerInfo,
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

async function createApp() {
  const { adminRoutes } = await import("./index.js");
  const app = new OpenAPIHono();
  app.use("*", async (c, next) => {
    c.set("requestId", "req_admin_1");
    await next();
  });
  app.route("/", adminRoutes);
  return app;
}

function adminHeaders() {
  return {
    "content-type": "application/json",
    "x-admin-key": ADMIN_KEY,
  };
}

describe("admin feature flag runtime-only overrides", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
    vi.stubEnv("ADMIN_API_KEY", ADMIN_KEY);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns explicit runtime-only metadata when recording an override", async () => {
    const app = await createApp();

    const response = await app.request("/feature-flags", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        organizationId: "org_1",
        flag: "ai-streaming",
        enabled: true,
      }),
    });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      organizationId: "org_1",
      flag: "ai-streaming",
      enabled: true,
      runtimeOnlyOverride: {
        enabled: true,
        updatedBy: "admin-api",
      },
      metadata: {
        storage: "process-memory",
        scope: "single-process",
        persistence: "runtime-only",
        persistent: false,
        productionSafe: false,
        appliesToFeatureEvaluation: false,
      },
    });
    expect(Date.parse(body.runtimeOnlyOverride.updatedAt)).not.toBeNaN();
  });

  it("lists a boolean compatibility view plus auditable runtime-only records", async () => {
    const app = await createApp();

    await app.request("/feature-flags", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        organizationId: "org_1",
        flag: "ai-streaming",
        enabled: true,
      }),
    });

    const response = await app.request("/feature-flags", {
      method: "GET",
      headers: { "x-admin-key": ADMIN_KEY },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.overrides).toEqual({ org_1: { "ai-streaming": true } });
    expect(body.runtimeOnlyOverrides.org_1["ai-streaming"]).toMatchObject({
      enabled: true,
      updatedBy: "admin-api",
    });
    expect(Date.parse(body.runtimeOnlyOverrides.org_1["ai-streaming"].updatedAt)).not.toBeNaN();
    expect(body.metadata).toMatchObject({
      storage: "process-memory",
      scope: "single-process",
      persistence: "runtime-only",
      persistent: false,
      productionSafe: false,
      appliesToFeatureEvaluation: false,
    });
  });

  it("logs an audit-friendly event when recording an override", async () => {
    const app = await createApp();

    await app.request("/feature-flags", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        organizationId: "org_1",
        flag: "ai-streaming",
        enabled: false,
      }),
    });

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      "Runtime-only feature flag override recorded",
      expect.objectContaining({
        auditEvent: "admin.feature_flag_override.runtime_only.recorded",
        organizationId: "org_1",
        flag: "ai-streaming",
        enabled: false,
        requestId: "req_admin_1",
        storage: "process-memory",
        persistence: "runtime-only",
        persistent: false,
        productionSafe: false,
        appliesToFeatureEvaluation: false,
      }),
    );
  });
});

describe("admin payment order refund", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_API_KEY", ADMIN_KEY);
    refundPaymentOrderMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refunds and reports whether the grant was taken back", async () => {
    refundPaymentOrderMock.mockResolvedValue({
      status: "succeeded",
      refundedMinor: 6800,
      revocation: { revoked: false, reason: "credits_already_spent" },
    });
    const app = await createApp();

    const res = await app.request("/payment-orders/order_1/refund", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ refundId: "r1", reason: "duplicate charge" }),
    });

    expect(res.status).toBe(200);
    expect(refundPaymentOrderMock).toHaveBeenCalledWith({
      orderId: "order_1",
      refundId: "r1",
      reason: "duplicate charge",
    });
    expect(await res.json()).toMatchObject({ revocation: { revoked: false } });
  });

  it("maps a refusal to its status and code", async () => {
    const app = await createApp();
    // The route's own BillingError, so `instanceof` sees the same class.
    const { BillingError } = await import("@nebutra/billing");
    refundPaymentOrderMock.mockRejectedValue(
      new BillingError("not refundable", "ORDER_NOT_REFUNDABLE", 409),
    );

    const res = await app.request("/payment-orders/order_1/refund", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ refundId: "r1" }),
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "ORDER_NOT_REFUNDABLE" });
  });

  it("refuses a caller without the admin key", async () => {
    const app = await createApp();

    const res = await app.request("/payment-orders/order_1/refund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refundId: "r1" }),
    });

    expect(res.status).toBe(401);
    expect(refundPaymentOrderMock).not.toHaveBeenCalled();
  });
});
