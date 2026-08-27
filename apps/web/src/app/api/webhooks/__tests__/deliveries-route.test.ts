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

vi.mock("@/lib/db", () => ({
  db: {
    webhookEvent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const mockedGetAuth = vi.mocked(getAuth);
const mockedFindMany = vi.mocked(db.webhookEvent.findMany);
const mockedFindFirst = vi.mocked(db.webhookEvent.findFirst);
const mockedCount = vi.mocked(db.webhookEvent.count);

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
  secret: "whsec_x",
  eventTypes: ["invoice.paid"],
  active: true,
  createdAt: "2026-05-01T00:00:00.000Z",
};

async function loadRoute() {
  return import("@/app/api/webhooks/[id]/deliveries/route");
}

function buildCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/webhooks/[id]/deliveries", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockProvider.listEndpoints.mockReset();
    mockProvider.retryMessage.mockReset();
    mockedFindMany.mockReset();
    mockedFindFirst.mockReset();
    mockedCount.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when no session", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false }));
    const { GET } = await loadRoute();
    const response = await GET(
      new Request("https://app.example/api/webhooks/ep_1/deliveries"),
      buildCtx("ep_1"),
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 when endpoint is not owned by tenant", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockProvider.listEndpoints.mockResolvedValue([]);
    const { GET } = await loadRoute();
    const response = await GET(
      new Request("https://app.example/api/webhooks/ep_1/deliveries"),
      buildCtx("ep_1"),
    );
    expect(response.status).toBe(404);
  });

  it("paginates and maps statuses correctly", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockProvider.listEndpoints.mockResolvedValue([sampleEndpoint]);
    const now = new Date("2026-05-08T12:00:00.000Z");
    mockedFindMany.mockResolvedValue([
      {
        id: "evt_1",
        provider: "ep_1",
        eventId: "msg_1",
        eventType: "invoice.paid",
        payload: { statusCode: 200, responseTimeMs: 87 },
        processedAt: now,
        errorMessage: null,
        retryCount: 0,
        createdAt: now,
      },
      {
        id: "evt_2",
        provider: "ep_1",
        eventId: "msg_2",
        eventType: "invoice.paid",
        payload: { statusCode: 500 },
        processedAt: null,
        errorMessage: "timeout",
        retryCount: 5,
        createdAt: now,
      },
      {
        id: "evt_3",
        provider: "ep_1",
        eventId: "msg_3",
        eventType: "invoice.paid",
        payload: {},
        processedAt: null,
        errorMessage: "5xx",
        retryCount: 1,
        createdAt: now,
      },
    ] as never);
    mockedCount.mockResolvedValue(3);

    const { GET } = await loadRoute();
    const response = await GET(
      new Request("https://app.example/api/webhooks/ep_1/deliveries?page=1&pageSize=10"),
      buildCtx("ep_1"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      deliveries: Array<{
        id: string;
        status: string;
        statusCode: number | null;
        responseTimeMs: number | null;
      }>;
      meta: { total: number };
    };
    expect(body.meta.total).toBe(3);
    expect(body.deliveries[0]).toMatchObject({
      id: "evt_1",
      status: "success",
      statusCode: 200,
      responseTimeMs: 87,
    });
    expect(body.deliveries[1]?.status).toBe("failed");
    expect(body.deliveries[2]?.status).toBe("retrying");
  });
});

describe("POST /api/webhooks/[id]/deliveries", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockProvider.listEndpoints.mockReset();
    mockProvider.retryMessage.mockReset();
    mockedFindFirst.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("replays an owned delivery through the webhook provider", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockProvider.listEndpoints.mockResolvedValue([sampleEndpoint]);
    mockedFindFirst.mockResolvedValue({
      id: "evt_2",
      provider: "ep_1",
      eventId: "msg_2",
      eventType: "invoice.paid",
      payload: { statusCode: 500 },
      processedAt: null,
      errorMessage: "timeout",
      retryCount: 5,
      createdAt: new Date("2026-05-08T12:00:00.000Z"),
    } as never);
    mockProvider.retryMessage.mockResolvedValue(undefined);

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/webhooks/ep_1/deliveries", {
        method: "POST",
        body: JSON.stringify({ deliveryId: "evt_2" }),
      }),
      buildCtx("ep_1"),
    );

    expect(response.status).toBe(200);
    expect(mockProvider.retryMessage).toHaveBeenCalledWith("msg_2", "ep_1");
  });

  it("rejects replay when delivery id is missing", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockProvider.listEndpoints.mockResolvedValue([sampleEndpoint]);

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/webhooks/ep_1/deliveries", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      buildCtx("ep_1"),
    );

    expect(response.status).toBe(400);
    expect(mockProvider.retryMessage).not.toHaveBeenCalled();
  });

  it("rejects replay for endpoints outside the current tenant", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockProvider.listEndpoints.mockResolvedValue([]);

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/webhooks/ep_1/deliveries", {
        method: "POST",
        body: JSON.stringify({ deliveryId: "evt_2" }),
      }),
      buildCtx("ep_1"),
    );

    expect(response.status).toBe(404);
    expect(mockProvider.retryMessage).not.toHaveBeenCalled();
  });
});
