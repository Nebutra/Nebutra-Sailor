import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

async function freshApp() {
  vi.resetModules();
  const { tenantContextMiddleware } = await import("../../middlewares/tenantContext.js");
  const { docsFeedbackRoutes } = await import("./feedback.js");
  const app = new OpenAPIHono();
  app.use("*", tenantContextMiddleware);
  app.route("/", docsFeedbackRoutes);
  return app;
}

const EVIL_ORIGIN = "https://evil.example.com";

async function allowedDocsOrigin(): Promise<string> {
  const { DOMAINS } = await import("../../config/env.js");
  return new URL(DOMAINS.docs).origin;
}

describe("POST /feedback — docs page/block feedback", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...savedEnv };
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_APP_PRIVATE_KEY;
  });

  it("answers 503 with a clear message when the GitHub App is not configured", async () => {
    const app = await freshApp();
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
      body: JSON.stringify({
        kind: "page",
        url: "/getting-started/installation",
        opinion: "good",
        message: "Great docs!",
      }),
    });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({ error: "not_configured" });
  });

  it("accepts block feedback shape too (schema union)", async () => {
    const app = await freshApp();
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.11" },
      body: JSON.stringify({
        kind: "block",
        url: "/getting-started/installation",
        blockId: "step-2",
        message: "This step is unclear",
      }),
    });
    // Still 503 (not configured) — proves the block-shape body passed schema
    // validation and reached the handler, not a 400.
    expect(res.status).toBe(503);
  });

  it("allows the docs origin via CORS", async () => {
    const app = await freshApp();
    const origin = await allowedDocsOrigin();
    const res = await app.request("/feedback", {
      method: "OPTIONS",
      headers: { origin, "access-control-request-method": "POST" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe(origin);
  });

  it("does not reflect an arbitrary origin", async () => {
    const app = await freshApp();
    const res = await app.request("/feedback", {
      method: "OPTIONS",
      headers: { origin: EVIL_ORIGIN, "access-control-request-method": "POST" },
    });
    expect(res.headers.get("access-control-allow-origin")).not.toBe(EVIL_ORIGIN);
  });

  it("rate limits after 10 requests/min from the same IP", async () => {
    const app = await freshApp();
    const ip = "203.0.113.66";
    let last: Response | undefined;
    for (let i = 0; i < 11; i++) {
      last = await app.request("/feedback", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({
          kind: "page",
          url: "/x",
          opinion: "good",
          message: `msg${i}`,
        }),
      });
    }
    expect(last?.status).toBe(429);
  });
});
