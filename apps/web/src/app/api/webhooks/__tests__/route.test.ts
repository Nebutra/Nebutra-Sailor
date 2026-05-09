import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
}));

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
    sessionClaims: { org_role: "org:admin" } as Record<string, unknown>,
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
  metadata: { lastDeliveredAt: "2026-05-08T12:00:00.000Z" },
};

async function loadRoute() {
  return import("@/app/api/webhooks/route");
}

describe("GET /api/webhooks", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockProvider.listEndpoints.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when no session", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false }));
    const { GET } = await loadRoute();
    const response = await GET(new Request("https://app.example/api/webhooks"));
    expect(response.status).toBe(401);
  });

  it("returns endpoints scoped to the org with masked secret", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockProvider.listEndpoints.mockResolvedValue([sampleEndpoint]);
    const { GET } = await loadRoute();
    const response = await GET(new Request("https://app.example/api/webhooks"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { endpoints: Array<Record<string, unknown>> };
    expect(body.endpoints).toHaveLength(1);
    expect(body.endpoints[0]).toMatchObject({
      id: "ep_1",
      url: "https://example.com/hook",
      events: ["invoice.paid"],
      isActive: true,
      lastDeliveredAt: "2026-05-08T12:00:00.000Z",
    });
    expect(body.endpoints[0]?.signingSecretMasked).toBe("whsec_••••1234");
    // Full secret must not leak
    expect(JSON.stringify(body)).not.toContain("whsec_abcdefghij1234");
  });
});

describe("POST /api/webhooks", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockProvider.createEndpoint.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 on invalid url", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "not-a-url", events: ["invoice.paid"] }),
      }),
    );
    expect(response.status).toBe(400);
    expect(mockProvider.createEndpoint).not.toHaveBeenCalled();
  });

  it("returns 400 when no events provided", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/hook", events: [] }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("creates an endpoint and returns plaintext signingSecret once", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockProvider.createEndpoint.mockResolvedValue(sampleEndpoint);
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://example.com/hook",
          events: ["invoice.paid"],
        }),
      }),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      endpoint: { id: string; signingSecretMasked: string };
      signingSecret: string;
    };
    expect(body.endpoint.id).toBe("ep_1");
    expect(body.signingSecret).toBe("whsec_abcdefghij1234");
    expect(body.endpoint.signingSecretMasked).toBe("whsec_••••1234");
    expect(mockProvider.createEndpoint).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({
        url: "https://example.com/hook",
        eventTypes: ["invoice.paid"],
        active: true,
      }),
    );
  });
});
