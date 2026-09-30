import { describe, expect, it, vi } from "vitest";
import { classifyFailure, isNeutralOutcome, probeModel } from "./verify";

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
