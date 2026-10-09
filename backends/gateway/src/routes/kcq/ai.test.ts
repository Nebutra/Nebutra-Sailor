import { jwtVerify } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }), error: vi.fn() },
}));

import { createKcqAiRoutes, createUserRateLimiter, type KcqAiIdentity } from "./ai.js";

const SECRET = "test-service-secret";
const ORIGIN = "https://chart.example.com";
const headers = { Origin: ORIGIN, "Content-Type": "application/json" };
const ok = () =>
  new Response(
    JSON.stringify({
      model: "x",
      choices: [{ message: { content: "hi" } }],
      usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
    }),
    { headers: { "content-type": "application/json" } },
  );

function setup(
  identity: KcqAiIdentity | null,
  upstream: () => Response = ok,
  rateLimited?: (id: string) => boolean,
) {
  const fetchImpl = vi.fn(async (..._args: Parameters<typeof fetch>) => upstream());
  const { signServiceToken } = require_auth();
  const app = createKcqAiRoutes({
    resolveIdentity: async () => identity,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    signToken: (claims) => signServiceToken(claims, SECRET),
    ...(rateLimited ? { rateLimited } : {}),
  });
  return { app, fetchImpl };
}
// Lazy: the auth package is imported for real so the token is a genuine HS256 JWT.
let authModule: typeof import("@nebutra/auth");
function require_auth() {
  return authModule;
}
async function claimsOf(init: RequestInit | undefined) {
  const auth = new Headers(init?.headers).get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET));
  return payload;
}
const chat = (body: Record<string, unknown> = {}) => ({
  method: "POST",
  headers,
  body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], ...body }),
});

beforeEach(async () => {
  authModule = await import("@nebutra/auth");
  vi.stubEnv("KCQ_PUBLIC_ORIGIN", ORIGIN);
  vi.stubEnv("KCQ_AI_STAFF_MODEL", "");
  vi.stubEnv("KCQ_AI_PUBLIC_MODEL", "");
});

describe("KCQ managed AI", () => {
  it("requires a session before touching Router", async () => {
    const { app, fetchImpl } = setup(null);
    expect((await app.request("/v1/models")).status).toBe(401);
    expect((await app.request("/v1/chat/completions", chat())).status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects cross-origin posts", async () => {
    const { app, fetchImpl } = setup({ userId: "u1", staffRole: null });
    const res = await app.request("/v1/chat/completions", {
      ...chat(),
      headers: { ...headers, Origin: "https://evil.example" },
    });
    expect(res.status).toBe(403);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("serves staff the Command Code default with a staff claim signed for Router", async () => {
    const { app, fetchImpl } = setup({ userId: "staff1", staffRole: "platform_operator" });
    const res = await app.request("/v1/chat/completions", chat());
    expect(res.status).toBe(200);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/internal\/v1\/chat\/completions$/);
    expect(JSON.parse(init.body as string).model).toBe("deepseek/deepseek-v4.1-flash");
    const claims = await claimsOf(init);
    expect(claims.userId).toBe("staff1");
    expect(claims.role).toBe("platform_operator");
  });

  it("serves a non-staff user the public default with no staff claim", async () => {
    const { app, fetchImpl } = setup({ userId: "cust1", staffRole: null });
    expect((await app.request("/v1/chat/completions", chat())).status).toBe(200);
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).model).toBe("gpt-5.6-luna");
    const claims = await claimsOf(init);
    expect(claims.userId).toBe("cust1");
    expect(claims.role).toBeUndefined();
  });

  it("ignores client attempts to pick the staff model or claim staff", async () => {
    const { app, fetchImpl } = setup({ userId: "cust1", staffRole: null });
    await app.request("/v1/chat/completions", {
      method: "POST",
      headers: { ...headers, "x-role": "platform_owner", "x-user-id": "staff1" },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4.1-flash",
        role: "platform_owner",
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).model).toBe("gpt-5.6-luna");
    const claims = await claimsOf(init);
    expect(claims.userId).toBe("cust1");
    expect(claims.role).toBeUndefined();
  });

  it("models are configurable per tier and listed per caller", async () => {
    vi.stubEnv("KCQ_AI_PUBLIC_MODEL", "other-public");
    const { app } = setup({ userId: "cust1", staffRole: null });
    const list = (await (await app.request("/v1/models")).json()) as { data: { id: string }[] };
    expect(list.data.map((m) => m.id)).toEqual(["other-public"]);
  });

  it("clamps output tokens and requests usage on streams", async () => {
    const { app, fetchImpl } = setup(
      { userId: "u", staffRole: null },
      () => new Response("data: [DONE]\n\n"),
    );
    await app.request("/v1/chat/completions", chat({ max_tokens: 999999, stream: true }));
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.max_tokens).toBe(8192);
    expect(sent.stream_options.include_usage).toBe(true);
  });

  it("rate limits per user before calling Router", async () => {
    const { app, fetchImpl } = setup(
      { userId: "u", staffRole: null },
      ok,
      createUserRateLimiter(2),
    );
    expect((await app.request("/v1/chat/completions", chat())).status).toBe(200);
    expect((await app.request("/v1/chat/completions", chat())).status).toBe(200);
    const limited = await app.request("/v1/chat/completions", chat());
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not leak Router error details", async () => {
    const { app } = setup(
      { userId: "u", staffRole: null },
      () =>
        new Response(JSON.stringify({ error: { message: "source commandcode down" } }), {
          status: 503,
        }),
    );
    const res = await app.request("/v1/chat/completions", chat());
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("commandcode");
  });

  it("rejects empty messages", async () => {
    const { app, fetchImpl } = setup({ userId: "u", staffRole: null });
    const res = await app.request("/v1/chat/completions", chat({ messages: [] }));
    expect(res.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("createUserRateLimiter", () => {
  it("limits per user independently", () => {
    const limited = createUserRateLimiter(1);
    expect(limited("a")).toBe(false);
    expect(limited("a")).toBe(true);
    expect(limited("b")).toBe(false);
  });
});
