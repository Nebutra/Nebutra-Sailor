import { describe, expect, it, vi } from "vitest";
import {
  detectProtocol,
  discoverCliProxyApi,
  discoverFalAi,
  discoverNewApiChannel,
  discoverOpenAiCompatible,
  guessModality,
} from "./discovery";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("guessModality", () => {
  it("recognizes the incident's image family by id shape", () => {
    expect(guessModality("gpt-image-2.5-flare")).toBe("IMAGE");
    expect(guessModality("gpt-image-2.5-sunburst")).toBe("IMAGE");
    expect(guessModality("gpt-image-2")).toBe("IMAGE");
  });
  it("defaults unknown ids to TEXT", () => {
    expect(guessModality("gpt-5.6-luna")).toBe("TEXT");
  });
});

describe("discoverOpenAiCompatible", () => {
  it("lists models from /v1/models", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ data: [{ id: "gpt-5.6-luna" }, { id: "gpt-image-2.5-flare" }] }),
    );
    const result = await discoverOpenAiCompatible(
      { baseUrl: "https://relay.example.com", apiKey: "sk-test" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    expect(result.protocol).toBe("OPENAI_COMPATIBLE");
    expect(result.models.map((m) => m.id)).toEqual(["gpt-5.6-luna", "gpt-image-2.5-flare"]);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://relay.example.com/v1/models");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
  });

  it("reports failure on a non-2xx without throwing", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 401));
    const result = await discoverOpenAiCompatible(
      { baseUrl: "https://relay.example.com" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    expect(result.note).toContain("401");
  });

  it("keeps per-model metadata the upstream returns (Command Code's /v1/models shape)", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        data: [
          {
            id: "gpt-5-codex",
            object: "model",
            name: "GPT-5 Codex",
            context_length: 400_000,
            supported_endpoints: ["/chat/completions"],
          },
          {
            id: "claude-opus-4-anthropic-only",
            name: "Claude Opus 4",
            context_length: 200_000,
            supported_endpoints: ["/messages"],
          },
          // No metadata at all — most OpenAI-compatible upstreams only send `id`.
          { id: "bare-model" },
        ],
      }),
    );
    const result = await discoverOpenAiCompatible(
      { baseUrl: "https://api.commandcode.ai/provider/v1", apiKey: "sk-test" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    const codex = result.models.find((m) => m.id === "gpt-5-codex");
    expect(codex?.capabilities).toEqual({
      name: "GPT-5 Codex",
      context_length: 400_000,
      supported_endpoints: ["/chat/completions"],
    });
    const anthropicOnly = result.models.find((m) => m.id === "claude-opus-4-anthropic-only");
    expect(anthropicOnly?.capabilities?.supported_endpoints).toEqual(["/messages"]);
    const bare = result.models.find((m) => m.id === "bare-model");
    expect(bare?.capabilities).toBeUndefined();
  });

  it("works with a non-root /v1 base URL (Command Code: https://api.commandcode.ai/provider/v1)", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: [{ id: "gpt-5-codex" }] }));
    const result = await discoverOpenAiCompatible(
      { baseUrl: "https://api.commandcode.ai/provider/v1", apiKey: "sk-test" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    const [url] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    // Not .../provider/v1/v1/models — the base already ends in /v1.
    expect(url).toBe("https://api.commandcode.ai/provider/v1/models");
  });
});

describe("discoverCliProxyApi", () => {
  it("annotates a model whose provider has no healthy auth file (the incident shape)", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith("/v1/models")) {
        return jsonResponse({ data: [{ id: "gpt-image-2.5-flare" }, { id: "claude-sonnet-5" }] });
      }
      if (url.endsWith("/v0/management/auth-files")) {
        // Only an anthropic account is healthy; codex (the gpt-image family) has none.
        return jsonResponse({
          files: [
            { provider: "anthropic", status: "ok" },
            { provider: "codex", disabled: true },
          ],
        });
      }
      throw new Error(`unexpected url ${url}`);
    });
    const result = await discoverCliProxyApi(
      { baseUrl: "http://nebutra-cliproxyapi.internal:8317", apiKey: "k", managementKey: "mgmt" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    expect(result.protocol).toBe("CLIPROXY_MANAGEMENT");
    const image = result.models.find((m) => m.id === "gpt-image-2.5-flare");
    const claude = result.models.find((m) => m.id === "claude-sonnet-5");
    expect(image?.capabilities?.authAvailable).toBe(false);
    expect(claude?.capabilities).toBeUndefined();
  });

  it("falls back to the served list when no management key is configured", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: [{ id: "gpt-image-2.5-flare" }] }));
    const result = await discoverCliProxyApi(
      { baseUrl: "http://x", apiKey: "k" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("discoverNewApiChannel", () => {
  it("reads the channel's advertised model CSV through the injected session", async () => {
    const session = {
      login: vi.fn(async () => ({ cookie: "c=1", userId: "1" })),
      findChannel: vi.fn(async () => ({
        id: 2,
        models: "gpt-image-2.5-flare,gpt-image-2.5-sunburst",
      })),
    };
    const result = await discoverNewApiChannel(
      { baseUrl: "http://new-api.internal", channelName: "cliproxyapi" },
      session,
    );
    expect(result.ok).toBe(true);
    expect(result.protocol).toBe("NEWAPI_ADMIN");
    expect(result.models.map((m) => m.id)).toEqual([
      "gpt-image-2.5-flare",
      "gpt-image-2.5-sunburst",
    ]);
    expect(session.findChannel).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "cliproxyapi",
    );
  });

  it("fails cleanly when the channel does not exist", async () => {
    const session = {
      login: vi.fn(async () => ({ cookie: "c=1", userId: "1" })),
      findChannel: vi.fn(async () => null),
    };
    const result = await discoverNewApiChannel(
      { baseUrl: "http://new-api.internal", channelName: "missing" },
      session,
    );
    expect(result.ok).toBe(false);
    expect(result.note).toContain("missing");
  });
});

describe("discoverFalAi", () => {
  it("turns operator-declared ids into discovered models (documented enumeration gap)", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));
    const result = await discoverFalAi(
      { baseUrl: "https://fal.run", apiKey: "k", knownModelIds: ["fal-ai/flux/dev"] },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    expect(result.protocol).toBe("FAL_REST");
    expect(result.models).toEqual([{ id: "fal-ai/flux/dev", modality: "IMAGE" }]);
  });

  it("refuses to claim discovery with no declared ids", async () => {
    const result = await discoverFalAi({ baseUrl: "https://fal.run" });
    expect(result.ok).toBe(false);
    expect(result.note).toContain("knownModelIds");
  });
});

describe("detectProtocol", () => {
  it("prefers OPENAI_COMPATIBLE when /v1/models answers", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: [{ id: "m" }] }));
    const result = await detectProtocol(
      { baseUrl: "https://relay.example.com", apiKey: "k" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.protocol).toBe("OPENAI_COMPATIBLE");
    expect(result.matched).toBe(true);
  });

  it("falls through to NEWAPI_ADMIN when a root password is given and the login endpoint answers", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith("/v1/models")) return jsonResponse({}, 404);
      if (url.endsWith("/api/user/login")) return jsonResponse({ success: true, data: { id: 1 } });
      throw new Error(`unexpected ${url}`);
    });
    const result = await detectProtocol(
      { baseUrl: "http://new-api.internal", rootPassword: "secret" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.protocol).toBe("NEWAPI_ADMIN");
    expect(result.matched).toBe(true);
  });

  it("returns UNKNOWN when nothing matches", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 500));
    const result = await detectProtocol(
      { baseUrl: "http://nothing.example.com" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.protocol).toBe("UNKNOWN");
    expect(result.matched).toBe(false);
  });
});
