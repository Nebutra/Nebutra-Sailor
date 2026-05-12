/**
 * Event Ingest Route Integration Tests
 *
 * Tests all cases for backends/gateway/src/routes/events/ingest.ts.
 *
 * The eventRoutes sub-app relies on tenantContextMiddleware (applied by the
 * parent app in production) to populate c.get("tenant"). In tests we wire up
 * a minimal wrapper app that replicates the production mount order.
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/env.js", () => ({
  env: {},
}));

vi.mock("@/services/event-ingest.js", () => ({
  ingestEvents: vi.fn().mockResolvedValue({ accepted: 0, duplicated: 0 }),
}));

vi.mock("@nebutra/auth/server", () => ({
  createAuth: vi.fn().mockResolvedValue({
    provider: "better-auth",
    getSession: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { tenantContextMiddleware } from "@/middlewares/tenantContext.js";
import { ingestEvents } from "@/services/event-ingest.js";
import { eventRoutes } from "../routes/events/ingest.js";
import { s2sHeaders, TEST_SERVICE_SECRET } from "./helpers/s2s-token.js";

const mockIngest = vi.mocked(ingestEvents);

// ---------------------------------------------------------------------------
// Minimal wrapper app — mirrors how index.ts mounts eventRoutes
// ---------------------------------------------------------------------------

const app = new OpenAPIHono();
app.use("*", tenantContextMiddleware);
app.route("/", eventRoutes);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTH_HEADERS = s2sHeaders({ userId: "user-123" });

function jsonRequest(path: string, body?: unknown, extraHeaders?: Record<string, string>) {
  const opts: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  return app.request(path, opts);
}

function authedJsonRequest(path: string, body?: unknown) {
  return jsonRequest(path, body, AUTH_HEADERS);
}

// ---------------------------------------------------------------------------
// Valid event fixture
// ---------------------------------------------------------------------------

const validEvent = {
  eventName: "user.signed_up",
  context: {
    tenantId: "tenant-abc",
    occurredAt: "2025-01-01T00:00:00Z",
  },
  payload: { plan: "pro" },
};

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockIngest.mockReset();
  mockIngest.mockResolvedValue({ accepted: 0, duplicated: 0 });
  process.env.SERVICE_SECRET = TEST_SERVICE_SECRET;
});

// ===========================================================================
// POST /ingest — Authentication
// ===========================================================================

describe("POST /ingest — authentication", () => {
  it("returns 401 when no auth headers are present", async () => {
    const res = await jsonRequest("/ingest", { events: [validEvent] });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 401 when x-user-id header is absent but other headers are present", async () => {
    const res = await jsonRequest(
      "/ingest",
      { events: [validEvent] },
      s2sHeaders({ orgId: "org-456" }),
    );

    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// POST /ingest — Validation
// ===========================================================================

describe("POST /ingest — body validation", () => {
  it("returns 400/422 when events array is empty", async () => {
    const res = await authedJsonRequest("/ingest", { events: [] });

    expect([400, 422]).toContain(res.status);
  });

  it("returns 400/422 when events array exceeds 1000 items", async () => {
    const oversized = Array.from({ length: 1001 }, (_, i) => ({
      ...validEvent,
      eventName: `event.${i}`,
    }));

    const res = await authedJsonRequest("/ingest", { events: oversized });

    expect([400, 422]).toContain(res.status);
  });

  it("returns 400/422 when eventName is missing", async () => {
    const res = await authedJsonRequest("/ingest", {
      events: [
        {
          context: {
            tenantId: "tenant-abc",
            occurredAt: "2025-01-01T00:00:00Z",
          },
          payload: {},
        },
      ],
    });

    expect([400, 422]).toContain(res.status);
  });

  it("returns 400/422 when context.tenantId is missing", async () => {
    const res = await authedJsonRequest("/ingest", {
      events: [
        {
          eventName: "user.signed_up",
          context: { occurredAt: "2025-01-01T00:00:00Z" },
          payload: {},
        },
      ],
    });

    expect([400, 422]).toContain(res.status);
  });

  it("returns 400/422 when context.occurredAt is missing", async () => {
    const res = await authedJsonRequest("/ingest", {
      events: [
        {
          eventName: "user.signed_up",
          context: { tenantId: "tenant-abc" },
          payload: {},
        },
      ],
    });

    expect([400, 422]).toContain(res.status);
  });

  it("returns 400/422 when request body is malformed JSON", async () => {
    const res = await app.request("/ingest", {
      method: "POST",
      body: "not-valid-json",
      headers: {
        "Content-Type": "application/json",
        ...AUTH_HEADERS,
      },
    });

    expect([400, 422]).toContain(res.status);
  });
});

// ===========================================================================
// POST /ingest — In-process ingestion
// ===========================================================================

describe("POST /ingest — ingestion", () => {
  it("returns 200 with accepted/duplicated counts on success", async () => {
    mockIngest.mockResolvedValueOnce({ accepted: 1, duplicated: 0 });

    const res = await authedJsonRequest("/ingest", { events: [validEvent] });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ accepted: 1, duplicated: 0 });
  });

  it("invokes the service module with the resolved tenant organizationId", async () => {
    await jsonRequest(
      "/ingest",
      { events: [validEvent] },
      s2sHeaders({ userId: "user-123", orgId: "org-789" }),
    );

    expect(mockIngest).toHaveBeenCalledOnce();
    const [, options] = mockIngest.mock.calls[0] ?? [];
    expect(options?.organizationId).toBe("org-789");
  });

  it("returns 400 when service raises a tenant mismatch", async () => {
    mockIngest.mockRejectedValueOnce(
      new Error("x-organization-id does not match event tenantId (other-tenant)"),
    );

    const res = await authedJsonRequest("/ingest", { events: [validEvent] });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Tenant mismatch");
  });

  it("returns 502 when the service module throws a generic error", async () => {
    mockIngest.mockRejectedValueOnce(new Error("ClickHouse unreachable"));

    const res = await authedJsonRequest("/ingest", { events: [validEvent] });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.message).toBe("ClickHouse unreachable");
  });

  it("accepts a batch of exactly 1000 events and returns 200", async () => {
    mockIngest.mockResolvedValueOnce({ accepted: 1000, duplicated: 0 });

    const maxBatch = Array.from({ length: 1000 }, (_, i) => ({
      ...validEvent,
      eventName: `batch.event.${i}`,
    }));

    const res = await authedJsonRequest("/ingest", { events: maxBatch });

    expect(res.status).toBe(200);
  });
});
