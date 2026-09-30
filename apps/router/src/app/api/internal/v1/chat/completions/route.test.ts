import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { signServiceToken } = await import("@nebutra/auth");
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
});
