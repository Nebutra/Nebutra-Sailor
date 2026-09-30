import { describe, expect, it, vi } from "vitest";
import { classifyFailure, isNeutralFailureReason, isNeutralOutcome, probeModel } from "./verify";

describe("classifyFailure", () => {
  it("matches the literal incident string over generic status inference", () => {
    expect(
      classifyFailure(
        503,
        "503 auth_not_found: no auth available (providers=codex, model=gpt-image-2.5)",
      ),
    ).toBe("auth_not_found");
  });
  it("maps 401/403 to unauthorized", () => {
    expect(classifyFailure(401, "")).toBe("unauthorized");
    expect(classifyFailure(403, "")).toBe("unauthorized");
  });
  it("maps 404 to model_not_found", () => {
    expect(classifyFailure(404, "")).toBe("model_not_found");
  });
  it("maps 429 to rate_limited, a neutral outcome", () => {
    expect(classifyFailure(429, "")).toBe("rate_limited");
  });
  it("maps 5xx to server_error", () => {
    expect(classifyFailure(502, "bad gateway")).toBe("server_error");
  });
  it("falls back to unknown", () => {
    expect(classifyFailure(400, "weird")).toBe("unknown");
  });
});

describe("isNeutralOutcome", () => {
  it("treats rate_limited as neutral, everything else as a real failure", () => {
    expect(
      isNeutralOutcome({
        outcome: "failure",
        reason: "rate_limited",
        latencyMs: 1,
        httpStatus: 429,
        detail: "",
      }),
    ).toBe(true);
    expect(
      isNeutralOutcome({
        outcome: "failure",
        reason: "auth_not_found",
        latencyMs: 1,
        httpStatus: 503,
        detail: "",
      }),
    ).toBe(false);
  });
});

describe("probeModel", () => {
  it("sends a max_tokens:1 chat completion for TEXT", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const result = await probeModel(
      {
        protocol: "OPENAI_COMPATIBLE",
        baseUrl: "https://relay.example.com",
        upstreamModel: "gpt-5.6-luna",
        modality: "TEXT",
      },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.outcome).toBe("success");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://relay.example.com/v1/chat/completions");
    const body = JSON.parse(init.body as string);
    expect(body.max_tokens).toBe(16);
  });

  it("sends the smallest/lowest-quality image request for IMAGE", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    await probeModel(
      {
        protocol: "OPENAI_COMPATIBLE",
        baseUrl: "https://relay.example.com",
        upstreamModel: "gpt-image-2.5-flare",
        modality: "IMAGE",
      },
      fetchImpl as unknown as typeof fetch,
    );
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://relay.example.com/v1/images/generations");
    const body = JSON.parse(init.body as string);
    expect(body.size).toBe("256x256");
    expect(body.quality).toBe("low");
  });

  it("reproduces the incident: a 503 auth_not_found body classifies correctly end to end", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          "503 auth_not_found: no auth available (providers=codex, model=gpt-image-2.5)",
          {
            status: 503,
          },
        ),
    );
    const result = await probeModel(
      {
        protocol: "CLIPROXY_MANAGEMENT",
        baseUrl: "http://nebutra-cliproxyapi.internal:8317",
        upstreamModel: "gpt-image-2.5",
        modality: "IMAGE",
      },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.outcome).toBe("failure");
    expect(result.outcome === "failure" && result.reason).toBe("auth_not_found");
  });

  it("classifies a network abort as a timeout, not unknown", async () => {
    const fetchImpl = vi.fn(async () => {
      const err = new Error("The operation was aborted");
      err.name = "TimeoutError";
      throw err;
    });
    const result = await probeModel(
      {
        protocol: "OPENAI_COMPATIBLE",
        baseUrl: "https://relay.example.com",
        upstreamModel: "m",
        modality: "TEXT",
      },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.outcome).toBe("failure");
    expect(result.outcome === "failure" && result.reason).toBe("timeout");
  });
});

describe("classifyFailure — plan tiers", () => {
  it("reads a plan that excludes the model as not_in_plan, not unauthorized", () => {
    expect(
      classifyFailure(
        403,
        '{"error":{"message":"MODEL_NOT_IN_PLAN: Claude Haiku 4.5 available in Pro and above plans"}}',
      ),
    ).toBe("not_in_plan");
  });
});

describe("classifyFailure — wrong_endpoint (probe-shape bug signal)", () => {
  it("reproduces the 2026-09-30 incident's exact body: a 400 unsupported_model classifies as wrong_endpoint, not unknown", () => {
    expect(
      classifyFailure(
        400,
        '{"error":{"message":"Model \\"claude-haiku-4-5-20251001\\" must be called via /provider/v1/messages (Anthropic Messages shape).","code":"unsupported_model"}}',
      ),
    ).toBe("wrong_endpoint");
  });

  it("matches on the human-readable phrase alone, without the machine code", () => {
    expect(classifyFailure(400, "This model must be called via /v1/messages")).toBe(
      "wrong_endpoint",
    );
  });
});

describe("isNeutralOutcome / isNeutralFailureReason — wrong_endpoint is neutral", () => {
  it("treats wrong_endpoint as neutral, same as rate_limited", () => {
    expect(
      isNeutralOutcome({
        outcome: "failure",
        reason: "wrong_endpoint",
        latencyMs: 1,
        httpStatus: 400,
        detail: "",
      }),
    ).toBe(true);
    // A real failure (not a shape mismatch) must still count.
    expect(
      isNeutralOutcome({
        outcome: "failure",
        reason: "model_not_found",
        latencyMs: 1,
        httpStatus: 404,
        detail: "",
      }),
    ).toBe(false);
  });

  it("isNeutralFailureReason mirrors isNeutralOutcome for the passive-signal path", () => {
    expect(isNeutralFailureReason("wrong_endpoint")).toBe(true);
    expect(isNeutralFailureReason("rate_limited")).toBe(true);
    expect(isNeutralFailureReason("auth_not_found")).toBe(false);
    expect(isNeutralFailureReason(null)).toBe(false);
    expect(isNeutralFailureReason(undefined)).toBe(false);
  });
});

describe("probeModel — shape follows the model's advertised endpoints", () => {
  it("routes a /messages-only model (Claude, via Command Code) to the Anthropic Messages probe with the right headers and body", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }),
    );
    const result = await probeModel(
      {
        protocol: "OPENAI_COMPATIBLE",
        baseUrl: "https://api.commandcode.ai/provider/v1",
        apiKey: "sk-test",
        upstreamModel: "claude-haiku-4-5-20251001",
        modality: "TEXT",
        capabilities: { supported_endpoints: ["/messages"] },
      },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.outcome).toBe("success");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.commandcode.ai/provider/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-test");
    expect(headers.Authorization).toBe("Bearer sk-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 16,
      messages: [{ role: "user", content: "ping" }],
    });
  });

  it("routes a /responses-only model to the Responses probe", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    await probeModel(
      {
        protocol: "OPENAI_COMPATIBLE",
        baseUrl: "https://api.commandcode.ai/provider/v1",
        apiKey: "sk-test",
        upstreamModel: "o5-responses-only",
        modality: "TEXT",
        capabilities: { supported_endpoints: ["/responses"] },
      },
      fetchImpl as unknown as typeof fetch,
    );
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.commandcode.ai/provider/v1/responses");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBeUndefined();
    expect(headers.Authorization).toBe("Bearer sk-test");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ model: "o5-responses-only", input: "ping", max_output_tokens: 16 });
  });

  it("keeps the chat/completions probe when /chat/completions is among the declared endpoints (GPT: chat/completions + responses)", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    await probeModel(
      {
        protocol: "OPENAI_COMPATIBLE",
        baseUrl: "https://api.commandcode.ai/provider/v1",
        apiKey: "sk-test",
        upstreamModel: "gpt-5-codex",
        modality: "TEXT",
        capabilities: { supported_endpoints: ["/chat/completions", "/responses"] },
      },
      fetchImpl as unknown as typeof fetch,
    );
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.commandcode.ai/provider/v1/chat/completions");
    const body = JSON.parse(init.body as string);
    expect(body.max_tokens).toBe(16);
  });

  it("keeps the chat/completions probe when no capabilities are declared at all (every source discovered before this metadata existed)", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    await probeModel(
      {
        protocol: "OPENAI_COMPATIBLE",
        baseUrl: "https://relay.example.com",
        upstreamModel: "gpt-5.6-luna",
        modality: "TEXT",
      },
      fetchImpl as unknown as typeof fetch,
    );
    const [url] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://relay.example.com/v1/chat/completions");
  });

  it("ignores supported_endpoints for IMAGE modality — it keeps the fixed image probe shape", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    await probeModel(
      {
        protocol: "OPENAI_COMPATIBLE",
        baseUrl: "https://relay.example.com",
        upstreamModel: "gpt-image-2.5-flare",
        modality: "IMAGE",
        capabilities: { supported_endpoints: ["/messages"] },
      },
      fetchImpl as unknown as typeof fetch,
    );
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://relay.example.com/v1/images/generations");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBeUndefined();
  });

  it("reproduces the live incident end to end: a /messages-only model probed correctly, but the upstream still rejects for plan reasons, classifies not_in_plan (not wrong_endpoint)", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          '{"error":{"code":"MODEL_NOT_IN_PLAN","message":"available in Pro and above plans"}}',
          {
            status: 403,
          },
        ),
    );
    const result = await probeModel(
      {
        protocol: "OPENAI_COMPATIBLE",
        baseUrl: "https://api.commandcode.ai/provider/v1",
        apiKey: "sk-test",
        upstreamModel: "claude-haiku-4-5-20251001",
        modality: "TEXT",
        capabilities: { supported_endpoints: ["/messages"] },
      },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.outcome).toBe("failure");
    expect(result.outcome === "failure" && result.reason).toBe("not_in_plan");
    const [url] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.commandcode.ai/provider/v1/messages");
  });
});
