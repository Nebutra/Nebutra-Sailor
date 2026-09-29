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
  const { docsChatRoutes } = await import("./chat.js");
  const app = new OpenAPIHono();
  app.use("*", tenantContextMiddleware);
  app.route("/", docsChatRoutes);
  return app;
}

const EVIL_ORIGIN = "https://evil.example.com";

async function allowedDocsOrigin(): Promise<string> {
  const { DOMAINS } = await import("../../config/env.js");
  return new URL(DOMAINS.docs).origin;
}

describe("POST /chat — docs assistant", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...savedEnv };
    for (const key of [
      "OPENROUTER_API_KEY",
      "ANTHROPIC_API_KEY",
      "OPENAI_API_KEY",
      "AI302_API_KEY",
    ]) {
      delete process.env[key];
    }
  });

  it("answers configured:false (200, not an error) when no LLM provider key is set", async () => {
    const app = await freshApp();
    const res = await app.request("/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.1" },
      body: JSON.stringify({ messages: [{ role: "user", content: "How do I deploy?" }] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ configured: false });
  });

  it("allows the docs origin via CORS", async () => {
    const app = await freshApp();
    const origin = await allowedDocsOrigin();
    const res = await app.request("/chat", {
      method: "OPTIONS",
      headers: {
        origin,
        "access-control-request-method": "POST",
      },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe(origin);
  });

  it("does not reflect an arbitrary origin", async () => {
    const app = await freshApp();
    const res = await app.request("/chat", {
      method: "OPTIONS",
      headers: {
        origin: EVIL_ORIGIN,
        "access-control-request-method": "POST",
      },
    });
    expect(res.headers.get("access-control-allow-origin")).not.toBe(EVIL_ORIGIN);
  });

  it("rate limits after 20 requests/min from the same IP", async () => {
    const app = await freshApp();
    const ip = "203.0.113.55";
    let last: Response | undefined;
    for (let i = 0; i < 21; i++) {
      last = await app.request("/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ messages: [{ role: "user", content: `q${i}` }] }),
      });
    }
    expect(last?.status).toBe(429);
  });
});
