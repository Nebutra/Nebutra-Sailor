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

// The GitHub Discussions sink is optional now — these tests exercise it only
// through a mock App that always throws, which is exactly the "not
// configured, or configured but failing" shape: getOctokit() throws before
// `new App(...)` when GITHUB_APP_ID/GITHUB_APP_PRIVATE_KEY are unset, and this
// mock throws the same way for the one test that *does* set them, so no real
// network call is ever attempted.
vi.mock("octokit", () => ({
  App: class {
    constructor() {
      throw new Error("GitHub App not reachable in tests");
    }
  },
}));

const { docsFeedbackCreateMock, docsFeedbackUpdateMock } = vi.hoisted(() => ({
  docsFeedbackCreateMock: vi.fn(async () => ({ id: "feedback_1" })),
  docsFeedbackUpdateMock: vi.fn(async () => ({})),
}));

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => ({
    docsFeedback: {
      create: docsFeedbackCreateMock,
      update: docsFeedbackUpdateMock,
    },
  }),
}));

// Same upstream env surface docs/chat.test.ts clears — triage silently skips
// (zero upstreams) unless a test opts in.
const UPSTREAM_ENV_KEYS = [
  "AI_GATEWAY_UPSTREAMS",
  "AI_GATEWAY_PROVIDER_CHAIN",
  "SERVICE_SECRET",
  "NEBUTRA_ROUTER_INTERNAL_URL",
  "NEW_API_BASE_URL",
  "NEBUTRA_NEW_API_URL",
  "NEW_API_ACCESS_TOKEN",
  "NEBUTRA_NEW_API_TOKEN",
  "DOCS_ASSISTANT_MODEL",
];

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

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("POST /feedback — docs page/block feedback", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    docsFeedbackCreateMock.mockClear();
    docsFeedbackCreateMock.mockImplementation(async () => ({ id: "feedback_1" }));
    docsFeedbackUpdateMock.mockClear();
    process.env = { ...savedEnv };
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_APP_PRIVATE_KEY;
    for (const key of UPSTREAM_ENV_KEYS) {
      delete process.env[key];
    }
  });

  it("stores the submission and answers 200 with no config required", async () => {
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

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
    expect(docsFeedbackCreateMock).toHaveBeenCalledTimes(1);
    const [args] = docsFeedbackCreateMock.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(args.data).toMatchObject({
      kind: "page",
      url: "/getting-started/installation",
      opinion: "good",
      message: "Great docs!",
      ipAddress: "203.0.113.10",
    });
  });

  it("accepts block feedback shape too (schema union) and stores its fields", async () => {
    const app = await freshApp();
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.11" },
      body: JSON.stringify({
        kind: "block",
        url: "/getting-started/installation",
        blockId: "step-2",
        blockBody: "Run `pnpm install`",
        message: "This step is unclear",
      }),
    });

    expect(res.status).toBe(200);
    const [args] = docsFeedbackCreateMock.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(args.data).toMatchObject({
      kind: "block",
      blockId: "step-2",
      blockBody: "Run `pnpm install`",
      message: "This step is unclear",
    });
  });

  it("returns 502 when the database write fails", async () => {
    docsFeedbackCreateMock.mockImplementationOnce(async () => {
      throw new Error("connection refused");
    });
    const app = await freshApp();
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.12" },
      body: JSON.stringify({ kind: "page", url: "/x", opinion: "bad", message: "broken" }),
    });
    expect(res.status).toBe(502);
  });

  it("posts to GitHub only when GITHUB_APP_ID/GITHUB_APP_PRIVATE_KEY are set, and never fails the request when that sink errors", async () => {
    process.env.GITHUB_APP_ID = "123";
    process.env.GITHUB_APP_PRIVATE_KEY = "fake-key";

    const app = await freshApp();
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.13" },
      body: JSON.stringify({ kind: "page", url: "/x", opinion: "good", message: "nice" }),
    });

    // The mocked App() throws — proves a failing/misconfigured GitHub sink
    // still stores feedback and answers 200, not 502.
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
    expect(docsFeedbackCreateMock).toHaveBeenCalledTimes(1);
  });

  it("triages the feedback asynchronously through the configured Router upstream, without delaying the response", async () => {
    process.env.NEW_API_BASE_URL = "https://router.example/v1";
    process.env.NEW_API_ACCESS_TOKEN = "router-token";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '{"sentiment":"negative","score":0.82,"category":"docs-gap","summary":"Install step is unclear"}',
              },
            },
          ],
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
    );

    const app = await freshApp();
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.14" },
      body: JSON.stringify({
        kind: "block",
        url: "/getting-started/installation",
        blockId: "step-2",
        message: "This step is unclear",
      }),
    });

    // The triage call has not necessarily resolved yet — the response must
    // not wait on it.
    expect(res.status).toBe(200);

    await flush();

    expect(docsFeedbackUpdateMock).toHaveBeenCalledTimes(1);
    const [update] = docsFeedbackUpdateMock.mock.calls[0] as [
      { where: { id: string }; data: Record<string, unknown> },
    ];
    expect(update.where).toEqual({ id: "feedback_1" });
    expect(update.data).toMatchObject({
      sentimentLabel: "negative",
      sentimentScore: 0.82,
      category: "docs-gap",
      summary: "Install step is unclear",
    });
  });

  it("skips triage silently when no Router upstream is configured", async () => {
    const app = await freshApp();
    await app.request("/feedback", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.15" },
      body: JSON.stringify({ kind: "page", url: "/x", opinion: "good", message: "thanks" }),
    });

    await flush();
    expect(docsFeedbackUpdateMock).not.toHaveBeenCalled();
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
