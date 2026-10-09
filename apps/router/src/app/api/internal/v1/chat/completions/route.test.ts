import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// `resolveInternalRoute` (`@/lib/supply/capability`) is a real DB lookup in
// production — mocked here so this route's tests stay DB-free, same as
// before this endpoint learned to check for an INTERNAL supply source.
// Default: no INTERNAL source, so every pre-existing test's New-API relay
// path is unaffected; the "internal source" tests override this per-case.
vi.mock("@/lib/supply/capability", () => ({
  resolveInternalRoute: vi.fn(async () => null),
}));

const { signServiceToken } = await import("@nebutra/auth");
const { resolveInternalRoute } = await import("@/lib/supply/capability");
const { POST } = await import("./route");

const ENV_KEYS = [
  "SERVICE_SECRET",
  "NEW_API_BASE_URL",
  "NEW_API_ACCESS_TOKEN",
  "NEBUTRA_NEW_API_URL",
  "NEBUTRA_NEW_API_TOKEN",
  "NEBUTRA_MODEL_ALIASES",
] as const;
const saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.restoreAllMocks();
});

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://router.internal/api/internal/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

/**
 * `proxyOpenAiCompatible` re-encodes a JSON body it read as a `Uint8Array`
 * (see `readRequestBody` in `../../../../../lib/openai-edge.ts`) rather than
 * forwarding the original string, so the mocked `fetch` sees bytes, not text.
 */
function decodeBody(body: unknown): Record<string, unknown> {
  const text = new TextDecoder().decode(body as Uint8Array);
  return JSON.parse(text) as Record<string, unknown>;
}

describe("POST /api/internal/v1/chat/completions", () => {
  it("rejects a request with no service token", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    process.env.NEW_API_BASE_URL = "https://newapi.example/v1";
    const res = await POST(request({ model: "gpt-4o-mini", messages: [] }));
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with the wrong secret", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    process.env.NEW_API_BASE_URL = "https://newapi.example/v1";
    const token = await signServiceToken({}, "another-secret");
    const res = await POST(
      request({ model: "gpt-4o-mini", messages: [] }, { "x-service-token": token }),
    );
    expect(res.status).toBe(401);
  });

  it("forwards to New-API with Router's own token when the service token is valid", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    process.env.NEW_API_BASE_URL = "https://newapi.example/v1";
    process.env.NEW_API_ACCESS_TOKEN = "na-token";
    delete process.env.NEBUTRA_MODEL_ALIASES;

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: "hi" } }] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const token = await signServiceToken({});
    const res = await POST(
      request(
        { model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] },
        { "x-service-token": token },
      ),
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://newapi.example/v1/chat/completions");
    expect((init.headers as Headers).get("authorization")).toBe("Bearer na-token");
    expect(decodeBody(init.body).model).toBe("gpt-4o-mini");
  });

  it("resolves a public alias to the mapped newapi upstream model before forwarding", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    process.env.NEW_API_BASE_URL = "https://newapi.example/v1";
    process.env.NEW_API_ACCESS_TOKEN = "na-token";
    process.env.NEBUTRA_MODEL_ALIASES = JSON.stringify([
      { publicModel: "gpt-5.6-luna", engineId: "newapi", upstreamModel: "gpt-4o", priority: 10 },
    ]);

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: "hi" } }] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const token = await signServiceToken({});
    await POST(
      request(
        { model: "gpt-5.6-luna", messages: [{ role: "user", content: "hi" }] },
        { "x-service-token": token },
      ),
    );

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(decodeBody(init.body).model).toBe("gpt-4o");
  });

  it("returns 503 when Router supply is not configured", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    process.env.NEW_API_ACCESS_TOKEN = "na-token";
    delete process.env.NEW_API_BASE_URL;
    delete process.env.NEBUTRA_NEW_API_URL;
    const token = await signServiceToken({});
    const res = await POST(
      request({ model: "gpt-4o-mini", messages: [] }, { "x-service-token": token }),
    );
    expect(res.status).toBe(503);
  });

  describe("internal-source routing (supply visibility follow-up, staff only)", () => {
    it("routes straight to an AVAILABLE INTERNAL source instead of New-API", async () => {
      process.env.SERVICE_SECRET = "test-secret";
      // Deliberately not configured — proves this path never touches New-API.
      delete process.env.NEW_API_BASE_URL;
      delete process.env.NEW_API_ACCESS_TOKEN;
      delete process.env.NEBUTRA_NEW_API_URL;
      delete process.env.NEBUTRA_NEW_API_TOKEN;

      vi.mocked(resolveInternalRoute).mockResolvedValueOnce({
        sourceKey: "commandcode",
        baseUrl: "https://api.commandcode.ai/provider/v1",
        apiKey: "sk-command-code-goat",
        upstreamModel: "gpt-5-codex",
        supported: true,
      });

      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "hi" } }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      );

      const token = await signServiceToken({ userId: "staff_1", role: "platform_operator" });
      const res = await POST(
        request(
          { model: "gpt-5-codex", messages: [{ role: "user", content: "hi" }] },
          { "x-service-token": token },
        ),
      );

      expect(res.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.commandcode.ai/provider/v1/chat/completions");
      expect((init.headers as Record<string, string>).Authorization).toBe(
        "Bearer sk-command-code-goat",
      );
      // Unlike the New-API leg, this forwarder sends the JSON body as a plain
      // string — it never round-trips through `readRequestBody`'s Uint8Array
      // re-encoding, so it is parsed directly rather than via `decodeBody`.
      expect(JSON.parse(init.body as string).model).toBe("gpt-5-codex");
    });

    it("falls back to New-API when the internal route only supports /messages (Anthropic format)", async () => {
      process.env.SERVICE_SECRET = "test-secret";
      process.env.NEW_API_BASE_URL = "https://newapi.example/v1";
      process.env.NEW_API_ACCESS_TOKEN = "na-token";

      vi.mocked(resolveInternalRoute).mockResolvedValueOnce({
        sourceKey: "commandcode",
        baseUrl: "https://api.commandcode.ai/provider/v1",
        apiKey: "sk-command-code-goat",
        upstreamModel: "claude-opus-4-anthropic-only",
        supported: false,
      });

      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "hi" } }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      );

      const token = await signServiceToken({ userId: "staff_1", role: "platform_operator" });
      const res = await POST(
        request(
          { model: "claude-opus-4-anthropic-only", messages: [{ role: "user", content: "hi" }] },
          { "x-service-token": token },
        ),
      );

      expect(res.status).toBe(200);
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://newapi.example/v1/chat/completions");
    });

    it("falls back to New-API when no INTERNAL source serves the model", async () => {
      process.env.SERVICE_SECRET = "test-secret";
      process.env.NEW_API_BASE_URL = "https://newapi.example/v1";
      process.env.NEW_API_ACCESS_TOKEN = "na-token";
      // resolveInternalRoute already defaults to null via the module mock.

      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "hi" } }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      );

      const token = await signServiceToken({});
      await POST(
        request(
          { model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] },
          { "x-service-token": token },
        ),
      );

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://newapi.example/v1/chat/completions");
    });

    const INTERNAL_ONLY = {
      sourceKey: "commandcode",
      baseUrl: "https://api.commandcode.ai/provider/v1",
      apiKey: "sk-command-code-goat",
      upstreamModel: "deepseek-v4.1-flash",
      supported: true,
    } as const;
    const okResponse = () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "hi" } }] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    const nonStaffTokens: Record<string, Parameters<typeof signServiceToken>[0]> = {
      "empty-context service token": {},
      "customer user token": { userId: "user_1" },
      "customer with a product role": { userId: "user_1", role: "org:admin" },
      "staff role claim without a user": { role: "platform_owner" },
      "user with an unknown role string": { userId: "user_1", role: "platform_god" },
    };

    for (const [label, claims] of Object.entries(nonStaffTokens)) {
      it(`never consults or reaches an INTERNAL source for a non-staff caller (${label})`, async () => {
        process.env.SERVICE_SECRET = "test-secret";
        process.env.NEW_API_BASE_URL = "https://newapi.example/v1";
        process.env.NEW_API_ACCESS_TOKEN = "na-token";
        delete process.env.NEBUTRA_MODEL_ALIASES;
        vi.mocked(resolveInternalRoute).mockClear();
        vi.mocked(resolveInternalRoute).mockResolvedValue(INTERNAL_ONLY);
        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(okResponse());

        const token = await signServiceToken(claims);
        const res = await POST(
          request(
            { model: "deepseek/deepseek-v4.1-flash", messages: [{ role: "user", content: "hi" }] },
            { "x-service-token": token },
          ),
        );

        expect(res.status).toBe(200);
        expect(resolveInternalRoute).not.toHaveBeenCalled();
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("https://newapi.example/v1/chat/completions");
        expect(url).not.toContain("commandcode");
        expect((init.headers as Headers).get("authorization")).toBe("Bearer na-token");
        vi.mocked(resolveInternalRoute).mockResolvedValue(null);
      });
    }

    it("a model that exists only on an INTERNAL source errors for non-staff instead of going internal", async () => {
      process.env.SERVICE_SECRET = "test-secret";
      process.env.NEW_API_BASE_URL = "https://newapi.example/v1";
      process.env.NEW_API_ACCESS_TOKEN = "na-token";
      delete process.env.NEBUTRA_MODEL_ALIASES;
      vi.mocked(resolveInternalRoute).mockResolvedValue(INTERNAL_ONLY);
      // Public supply (New-API) does not know the model.
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "model not found" } }), {
          headers: { "content-type": "application/json" },
          status: 404,
        }),
      );

      const token = await signServiceToken({ userId: "user_1" });
      const res = await POST(
        request(
          { model: "deepseek/deepseek-v4.1-flash", messages: [{ role: "user", content: "hi" }] },
          { "x-service-token": token },
        ),
      );

      expect(res.status).toBe(404);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect((fetchMock.mock.calls[0] as [string])[0]).toBe(
        "https://newapi.example/v1/chat/completions",
      );
      vi.mocked(resolveInternalRoute).mockResolvedValue(null);
    });

    it("rejects a staff-claim token signed with the wrong secret", async () => {
      process.env.SERVICE_SECRET = "test-secret";
      const token = await signServiceToken(
        { userId: "u", role: "platform_owner" },
        "attacker-secret",
      );
      const res = await POST(
        request({ model: "gpt-5-codex", messages: [] }, { "x-service-token": token }),
      );
      expect(res.status).toBe(401);
      expect(resolveInternalRoute).not.toHaveBeenCalled();
    });
  });
});
