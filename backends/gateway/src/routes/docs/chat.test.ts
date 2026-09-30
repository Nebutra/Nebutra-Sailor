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

// The docs corpus fetch (context.ts's `retrieveContext`, over the network to
// `${DOMAINS.docs}/llms-full.txt`) is unrelated to what these tests exercise
// — Router upstream selection/fallback — and would otherwise be the first
// thing to consume a mocked `fetch` response meant for the upstream call.
vi.mock("./context.js", () => ({
  retrieveContext: vi.fn(async () => ""),
}));

// All AiGatewayUpstream env inputs `defaultEnvUpstreams()` reads (see
// ../ai/gateway.ts): cleared before every test so "not configured" really
// means zero upstreams, not a leftover from a previous test or the shell.
const UPSTREAM_ENV_KEYS = [
  "AI_GATEWAY_UPSTREAMS",
  "AI_GATEWAY_PROVIDER_CHAIN",
  "NEW_API_BASE_URL",
  "NEBUTRA_NEW_API_URL",
  "NEW_API_ACCESS_TOKEN",
  "NEBUTRA_NEW_API_TOKEN",
  "SUB2API_BASE_URL",
  "NEBUTRA_SUB2API_URL",
  "SUB2API_ACCESS_TOKEN",
  "NEBUTRA_SUB2API_TOKEN",
  "OPENAI_BASE_URL",
  "OPENAI_API_KEY",
  "OPENROUTER_BASE_URL",
  "OPENROUTER_API_KEY",
  "LITELLM_BASE_URL",
  "LITELLM_API_KEY",
  "PORTKEY_BASE_URL",
  "PORTKEY_API_KEY",
  "AI_GATEWAY_BASE_URL",
  "AI_GATEWAY_API_KEY",
  "AI_CUSTOM_BASE_URL",
  "AI_CUSTOM_API_KEY",
  "AI_CUSTOM_PROVIDER",
  "DOCS_ASSISTANT_MODEL",
  // Legacy provider keys the old third-party-key implementation read —
  // kept cleared so a leftover from that design can't reintroduce it.
  "ANTHROPIC_API_KEY",
  "AI302_API_KEY",
];

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

function postChat(app: OpenAPIHono, ip = "203.0.113.1") {
  return app.request("/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ messages: [{ role: "user", content: "How do I deploy?" }] }),
  });
}

describe("POST /chat — docs assistant", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...savedEnv };
    for (const key of UPSTREAM_ENV_KEYS) {
      delete process.env[key];
    }
  });

  it("answers configured:false (200, not an error) when no Router upstream is configured", async () => {
    const app = await freshApp();
    const res = await postChat(app);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ configured: false });
  });

  it("uses the newapi (Nebutra Router) upstream when NEW_API_BASE_URL/NEW_API_ACCESS_TOKEN are set", async () => {
    process.env.NEW_API_BASE_URL = "https://router.example/v1";
    process.env.NEW_API_ACCESS_TOKEN = "router-token";

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "chatcmpl_docs",
          choices: [{ message: { role: "assistant", content: "Run `pnpm db:deploy` first." } }],
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
    );

    const app = await freshApp();
    const res = await postChat(app);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      configured: true,
      reply: "Run `pnpm db:deploy` first.",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://router.example/v1/chat/completions");
    expect(init.headers).toMatchObject({ Authorization: "Bearer router-token" });
    const sentBody = JSON.parse(String(init.body));
    expect(sentBody.model).toBe("gpt-4o-mini");
    expect(sentBody.stream).toBe(false);
    expect(sentBody.messages[0]).toMatchObject({ role: "system" });
    expect(sentBody.messages.at(-1)).toMatchObject({ role: "user", content: "How do I deploy?" });
  });

  it("sends DOCS_ASSISTANT_MODEL when set, instead of the default", async () => {
    process.env.NEW_API_BASE_URL = "https://router.example/v1";
    process.env.NEW_API_ACCESS_TOKEN = "router-token";
    process.env.DOCS_ASSISTANT_MODEL = "custom-docs-model";

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const app = await freshApp();
    await postChat(app);

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body)).model).toBe("custom-docs-model");
  });

  it("falls back to the next configured upstream when the first is unreachable", async () => {
    process.env.NEW_API_BASE_URL = "https://router.example/v1";
    process.env.NEW_API_ACCESS_TOKEN = "router-token";
    process.env.OPENAI_API_KEY = "sk-fallback";

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "down" }), { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "from fallback" } }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      );

    const app = await freshApp();
    const res = await postChat(app);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ configured: true, reply: "from fallback" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://router.example/v1/chat/completions");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("returns 502 when every configured upstream fails", async () => {
    process.env.NEW_API_BASE_URL = "https://router.example/v1";
    process.env.NEW_API_ACCESS_TOKEN = "router-token";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "down" }), { status: 500 }),
    );

    const app = await freshApp();
    const res = await postChat(app);

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({
      error: "The docs assistant is temporarily unavailable.",
    });
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
