import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { enqueueCompletionMock } = vi.hoisted(() => ({
  enqueueCompletionMock: vi.fn(async () => undefined),
}));

vi.mock("@nebutra/gateway-core", async () => {
  const actual =
    await vi.importActual<typeof import("@nebutra/gateway-core")>("@nebutra/gateway-core");
  return {
    ...actual,
    createGatewayPipelineMiddleware: () => async (c: never, next: () => Promise<void>) => {
      const context = c as {
        set: (key: string, value: unknown) => void;
      };
      context.set("resolvedApiKey", {
        id: "key_1",
        organizationId: "org_1",
        userId: "user_1",
        scopes: ["chat:completions"],
        rateLimitRps: 100,
        plan: "PRO",
      });
      context.set("gatewayRequestId", "req_1");
      await next();
    },
    enqueueCompletion: enqueueCompletionMock,
  };
});

vi.mock("@nebutra/logger", () => ({
  logger: {
    child: () => ({
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

import type { GatewayDeps } from "../../lib/gateway-deps";
import { type AiGatewayUpstream, createAiGatewayRoutes } from "./gateway";

function createDeps(): GatewayDeps {
  return {
    redis: {
      get: vi.fn(async () => null),
      set: vi.fn(async () => "OK"),
      del: vi.fn(async () => 1),
    },
    prisma: {} as GatewayDeps["prisma"],
    queue: { enqueue: vi.fn(async () => undefined) } as unknown as GatewayDeps["queue"],
    getCreditBalance: vi.fn(async () => 100),
  };
}

function createApp(upstreams: readonly AiGatewayUpstream[]) {
  const app = new OpenAPIHono();
  app.route(
    "/",
    createAiGatewayRoutes(createDeps(), {
      resolveUpstreams: async () => upstreams,
    }),
  );
  return app;
}

function createAppFromEnv() {
  const app = new OpenAPIHono();
  app.route("/", createAiGatewayRoutes(createDeps()));
  return app;
}

async function postChat(app: OpenAPIHono) {
  return app.request("/chat/completions", {
    method: "POST",
    headers: {
      authorization: "Bearer sk-sailor-test",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
    }),
  });
}

describe("AI gateway upstream governance", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    enqueueCompletionMock.mockClear();
  });

  it("falls back to the next configured upstream on retryable failures", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "rate limited" }), { status: 429 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "chatcmpl_fallback",
            model: "gpt-4o-mini",
            choices: [],
            usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
      );
    const app = createApp([
      {
        id: "openai-primary",
        apiKey: "primary-key",
        baseUrl: "https://primary.example/v1",
        provider: "openai",
      },
      {
        id: "openai-fallback",
        apiKey: "fallback-key",
        baseUrl: "https://fallback.example/v1",
        provider: "openai",
      },
    ]);

    const response = await postChat(app);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-nebutra-ai-provider")).toBe("openai-fallback");
    expect(await response.json()).toMatchObject({ id: "chatcmpl_fallback" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://primary.example/v1/chat/completions");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://fallback.example/v1/chat/completions");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: "Bearer fallback-key" }),
    });
    expect(enqueueCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        requestId: "req_1",
        status: "success",
        totalTokens: 5,
      }),
      expect.any(Object),
    );
  });

  it("adds tenant, user, request, and provider metadata to upstream requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "chatcmpl_1",
          model: "gpt-4o-mini",
          choices: [],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
    );
    const app = createApp([
      {
        id: "litellm-pool-a",
        apiKey: "pool-key",
        baseUrl: "https://litellm.example/v1",
        provider: "litellm",
      },
    ]);

    const response = await postChat(app);

    expect(response.status).toBe(200);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer pool-key",
      "X-Nebutra-Api-Key-Id": "key_1",
      "X-Nebutra-Provider": "litellm-pool-a",
      "X-Nebutra-Request-Id": "req_1",
      "X-Nebutra-Tenant-Id": "org_1",
      "X-Nebutra-User-Id": "user_1",
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      user: "user_1",
    });
  });

  it("uses env-configured upstream pools without embedding plaintext keys in JSON", async () => {
    vi.stubEnv(
      "AI_GATEWAY_UPSTREAMS",
      JSON.stringify([
        {
          id: "pool-a",
          provider: "litellm",
          baseUrl: "https://pool-a.example/v1",
          apiKeyEnv: "POOL_A_KEY",
        },
        {
          id: "pool-b",
          provider: "openrouter",
          baseUrl: "https://pool-b.example/v1",
          apiKeyEnv: "POOL_B_KEY",
          headers: { "X-Provider-Routing": "latency" },
        },
      ]),
    );
    vi.stubEnv("AI_GATEWAY_PROVIDER_CHAIN", "openrouter,litellm");
    vi.stubEnv("POOL_A_KEY", "pool-a-key");
    vi.stubEnv("POOL_B_KEY", "pool-b-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "chatcmpl_pool_b",
          model: "gpt-4o-mini",
          choices: [],
          usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
    );

    const response = await postChat(createAppFromEnv());

    expect(response.status).toBe(200);
    expect(response.headers.get("x-nebutra-ai-provider")).toBe("pool-b");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://pool-b.example/v1/chat/completions");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: "Bearer pool-b-key",
        "X-Provider-Routing": "latency",
      }),
    });
  });
});
