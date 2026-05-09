import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getAuth: vi.fn() }));

const mockProvider = {
  name: "custom" as const,
  createEndpoint: vi.fn(),
  updateEndpoint: vi.fn(),
  deleteEndpoint: vi.fn(),
  listEndpoints: vi.fn(),
  sendEvent: vi.fn(),
  getDeliveryAttempts: vi.fn(),
  getDeadLetterDeliveries: vi.fn(),
  retryMessage: vi.fn(),
  rotateSecret: vi.fn(),
  verifySignature: vi.fn(),
  close: vi.fn(),
};

vi.mock("@nebutra/webhooks", () => ({
  getWebhooks: vi.fn(async () => mockProvider),
}));

vi.mock("@nebutra/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getAuth } from "@/lib/auth";

const mockedGetAuth = vi.mocked(getAuth);

function buildAuth(overrides: Partial<Awaited<ReturnType<typeof getAuth>>> = {}) {
  return {
    userId: "user_1",
    orgId: "org_1",
    sessionClaims: {} as Record<string, unknown>,
    isSignedIn: true,
    ...overrides,
  } as Awaited<ReturnType<typeof getAuth>>;
}

const sampleEndpoint = {
  id: "ep_1",
  url: "https://example.com/hook",
  tenantId: "org_1",
  secret: "whsec_abcdefghij1234",
  eventTypes: ["invoice.paid"],
  active: true,
  createdAt: "2026-05-01T00:00:00.000Z",
};

async function loadRoute() {
  return import("@/app/api/webhooks/[id]/route");
}

function buildCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/webhooks/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockProvider.listEndpoints.mockReset();
    mockProvider.updateEndpoint.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 404 when the endpoint does not belong to the org", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockProvider.listEndpoints.mockResolvedValue([]);
    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request("https://app.example/api/webhooks/ep_1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      }),
      buildCtx("ep_1"),
    );
    expect(response.status).toBe(404);
    expect(mockProvider.updateEndpoint).not.toHaveBeenCalled();
  });

  it("updates allowed fields and returns the masked DTO", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockProvider.listEndpoints.mockResolvedValue([sampleEndpoint]);
    mockProvider.updateEndpoint.mockResolvedValue({
      ...sampleEndpoint,
      active: false,
      url: "https://example.com/v2",
    });
    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request("https://app.example/api/webhooks/ep_1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/v2", isActive: false }),
      }),
      buildCtx("ep_1"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { endpoint: { isActive: boolean; url: string } };
    expect(body.endpoint.isActive).toBe(false);
    expect(body.endpoint.url).toBe("https://example.com/v2");
    expect(mockProvider.updateEndpoint).toHaveBeenCalledWith(
      "ep_1",
      expect.objectContaining({ url: "https://example.com/v2", active: false }),
    );
  });

  it("returns 400 when no fields provided", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockProvider.listEndpoints.mockResolvedValue([sampleEndpoint]);
    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request("https://app.example/api/webhooks/ep_1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      buildCtx("ep_1"),
    );
    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/webhooks/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockProvider.listEndpoints.mockReset();
    mockProvider.deleteEndpoint.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false }));
    const { DELETE } = await loadRoute();
    const response = await DELETE(
      new Request("https://app.example/api/webhooks/ep_1", { method: "DELETE" }),
      buildCtx("ep_1"),
    );
    expect(response.status).toBe(401);
  });

  it("deletes when the endpoint belongs to the org", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockProvider.listEndpoints.mockResolvedValue([sampleEndpoint]);
    mockProvider.deleteEndpoint.mockResolvedValue(undefined);
    const { DELETE } = await loadRoute();
    const response = await DELETE(
      new Request("https://app.example/api/webhooks/ep_1", { method: "DELETE" }),
      buildCtx("ep_1"),
    );
    expect(response.status).toBe(200);
    expect(mockProvider.deleteEndpoint).toHaveBeenCalledWith("ep_1");
  });

  it("returns 404 when endpoint not owned by tenant", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockProvider.listEndpoints.mockResolvedValue([]);
    const { DELETE } = await loadRoute();
    const response = await DELETE(
      new Request("https://app.example/api/webhooks/ep_1", { method: "DELETE" }),
      buildCtx("ep_1"),
    );
    expect(response.status).toBe(404);
    expect(mockProvider.deleteEndpoint).not.toHaveBeenCalled();
  });
});
