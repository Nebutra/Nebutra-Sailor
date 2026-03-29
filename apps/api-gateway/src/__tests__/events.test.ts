/**
 * Event Ingest Route Integration Tests
 *
 * Tests all cases for apps/api-gateway/src/routes/events/ingest.ts.
 *
 * The eventRoutes sub-app relies on tenantContextMiddleware (applied by the
 * parent app in production) to populate c.get("tenant"). In tests we wire up
 * a minimal wrapper app that replicates the production mount order.
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE any route/middleware imports so Vitest hoists them.
// ---------------------------------------------------------------------------

// Mock the env module so the route picks up the test service URL.
vi.mock("@/config/env.js", () => ({
  env: {
    EVENT_INGEST_SERVICE_URL: "http://event-ingest.test",
  },
}));

// Mock @nebutra/auth/server so JWT verification never makes real network calls.
vi.mock("@nebutra/auth/server", () => ({
  createAuth: vi.fn().mockResolvedValue({
    provider: "better-auth",
    getSession: vi.fn().mockResolvedValue(null),
  }),
}));

// Mock @nebutra/logger to suppress log output during tests.
vi.mock("@nebutra/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { tenantContextMiddleware } from "@/middlewares/tenantContext.js";
import { eventRoutes } from "../routes/events/ingest.js";
import { s2sHeaders, TEST_SERVICE_SECRET } from "./helpers/s2s-token.js";

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
  vi.restoreAllMocks();
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
// POST /ingest — Upstream proxy
// ===========================================================================

describe("POST /ingest — upstream proxy", () => {
  it("returns 200 when valid payload and auth header are provided and upstream returns 200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ accepted: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = await authedJsonRequest("/ingest", { events: [validEvent] });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  it("calls the upstream URL from the env config", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    await authedJsonRequest("/ingest", { events: [validEvent] });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("http://event-ingest.test");
  });

  it("forwards x-organization-id header to upstream when provided", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    await jsonRequest(
      "/ingest",
      { events: [validEvent] },
      s2sHeaders({ userId: "user-123", orgId: "org-789" }),
    );

    expect(fetchSpy).toHaveBeenCalledOnce();
    // fetch(url, init) — init.headers contains the forwarded org header
    const calledInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const forwardedHeaders = calledInit.headers as Record<string, string>;
    expect(forwardedHeaders["x-organization-id"]).toBe("org-789");
  });

  it("proxies the upstream status code when upstream returns a non-200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "service down" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = await authedJsonRequest("/ingest", { events: [validEvent] });

    // The handler proxies the upstream status code directly (503 in this case)
    expect(res.status).toBe(503);
  });

  it("returns 502 when fetch throws a network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const res = await authedJsonRequest("/ingest", { events: [validEvent] });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(typeof body.message).toBe("string");
  });

  it("returns 502 with the original error message when fetch throws an Error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const res = await authedJsonRequest("/ingest", { events: [validEvent] });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.message).toBe("ECONNREFUSED");
  });

  it("accepts a batch of exactly 1000 events and returns 200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ accepted: 1000 }), { status: 200 }),
    );

    const maxBatch = Array.from({ length: 1000 }, (_, i) => ({
      ...validEvent,
      eventName: `batch.event.${i}`,
    }));

    const res = await authedJsonRequest("/ingest", { events: maxBatch });

    expect(res.status).toBe(200);
  });
});
