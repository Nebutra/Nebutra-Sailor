import { jwtVerify } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }), error: vi.fn() },
}));

import { createKcqAiRoutes, createUserRateLimiter, type KcqAiIdentity } from "./ai.js";
import type { KcqAiBilling, KcqWalletReader } from "./ai-billing.js";
import { MarketSourceError } from "./twelve-data.js";

/** In-memory stand-in for the money seam with the same reserve / release / settle contract. */
function fakeBilling(balance: number) {
  const state = {
    balance,
    holds: new Map<string, number>(),
    settled: new Map<
      string,
      { totalCost: number; metadata: Record<string, unknown>; model: string }
    >(),
    reserveCalls: 0,
  };
  const price = {
    modelName: "m",
    unit: "PER_1M_TOKENS",
    currency: "USD",
    published: true,
    isActive: true,
    inputPerMTok: 1,
    outputPerMTok: 10,
    cacheReadPerMTok: null,
    cacheWritePerMTok: null,
    unitPrice: null,
  };
  const billing = {
    findPrice: vi.fn(async (name: string) =>
      name === "unpriced" ? null : { ...price, modelName: name },
    ),
    reserve: vi.fn(async (i: { requestId: string; amount: number; product?: string }) => {
      state.reserveCalls += 1;
      if (state.holds.has(i.requestId)) return true;
      if (state.balance < i.amount) return false;
      state.balance -= i.amount;
      state.holds.set(i.requestId, i.amount);
      return true;
    }),
    release: vi.fn(async (i: { requestId: string; amount: number }) => {
      if (state.holds.delete(i.requestId)) state.balance += i.amount;
    }),
    settle: vi.fn(
      async (i: {
        requestId: string;
        idempotencyKey: string;
        reserved: number;
        totalCost: number;
        model: string;
        metadata: Record<string, unknown>;
        product?: string;
      }) => {
        if (state.settled.has(i.idempotencyKey))
          return { settled: false as const, reason: "duplicate" as const };
        const held = state.holds.delete(i.requestId);
        state.balance += (held ? i.reserved : 0) - i.totalCost;
        state.settled.set(i.idempotencyKey, {
          totalCost: i.totalCost,
          metadata: i.metadata,
          model: i.model,
        });
        return { settled: true as const, charged: i.totalCost, refunded: 0 };
      },
    ),
    isSettled: vi.fn(async (_t: string, key: string) => state.settled.has(key)),
  };
  return { state, billing: billing as unknown as KcqAiBilling & typeof billing };
}

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
  money = fakeBilling(100),
) {
  const fetchImpl = vi.fn(async (..._args: Parameters<typeof fetch>) => upstream());
  const { signServiceToken } = require_auth();
  const app = createKcqAiRoutes({
    resolveIdentity: async () => identity,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    signToken: (claims) => signServiceToken(claims, SECRET),
    billing: money.billing,
    resolveWalletTenant: async () => "tenant_1",
    ...(rateLimited ? { rateLimited } : {}),
  });
  return { app, fetchImpl, money };
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

const usageBody = (prompt: number, completion: number) =>
  new Response(
    JSON.stringify({
      model: "x",
      choices: [{ message: { content: "hi" } }],
      usage: {
        prompt_tokens: prompt,
        completion_tokens: completion,
        total_tokens: prompt + completion,
      },
    }),
    { headers: { "content-type": "application/json" } },
  );
const customer: KcqAiIdentity = { userId: "cust1", staffRole: null };

describe("KCQ managed AI billing", () => {
  it("refuses with 402 and never calls Router when the KCQ balance is short", async () => {
    const { app, fetchImpl, money } = setup(customer, ok, undefined, fakeBilling(0));
    const res = await app.request("/v1/chat/completions", chat());
    expect(res.status).toBe(402);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("insufficient_balance");
    expect(body.error.message).toContain("余额不足");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(money.state.settled.size).toBe(0);
  });

  it("reserves from max_tokens, then settles the actual cost at the shelf price", async () => {
    const { app, money } = setup(
      customer,
      () => usageBody(1_000_000, 100_000),
      undefined,
      fakeBilling(100),
    );
    const res = await app.request("/v1/chat/completions", chat({ max_tokens: 1000 }));
    expect(res.status).toBe(200);
    const reserveArg = money.billing.reserve.mock.calls[0]?.[0] as {
      amount: number;
      product: string;
    };
    expect(reserveArg.product).toBe("kcq");
    expect(reserveArg.amount).toBeGreaterThan(0);
    // $1/M in + $10/M out: 1M prompt tokens + 100k completion = $1 + $1.
    const entry = [...money.state.settled.values()][0];
    expect(entry?.totalCost).toBeCloseTo(2, 6);
    expect(entry?.metadata.product).toBe("kcq");
    expect(entry?.model).toBe("gpt-5.6-luna");
    expect(money.state.balance).toBeCloseTo(98, 6);
    expect(money.state.holds.size).toBe(0);
  });

  it("releases the hold and charges nothing when Router fails", async () => {
    const { app, money } = setup(
      customer,
      () => new Response("{}", { status: 503 }),
      undefined,
      fakeBilling(10),
    );
    expect((await app.request("/v1/chat/completions", chat())).status).toBe(502);
    expect(money.state.balance).toBe(10);
    expect(money.state.holds.size).toBe(0);
    expect(money.state.settled.size).toBe(0);
  });

  it("releases the hold when Router is unreachable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("down");
    });
    const money = fakeBilling(10);
    const app = createKcqAiRoutes({
      resolveIdentity: async () => customer,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      signToken: async () => "t",
      billing: money.billing,
      resolveWalletTenant: async () => "tenant_1",
    });
    expect((await app.request("/v1/chat/completions", chat())).status).toBe(502);
    expect(money.state.balance).toBe(10);
  });

  it("does not bill staff and does not touch the wallet", async () => {
    const { app, money } = setup({ userId: "s1", staffRole: "platform_operator" }, () =>
      usageBody(500, 500),
    );
    expect((await app.request("/v1/chat/completions", chat())).status).toBe(200);
    expect(money.billing.findPrice).not.toHaveBeenCalled();
    expect(money.billing.reserve).not.toHaveBeenCalled();
    expect(money.billing.settle).not.toHaveBeenCalled();
    expect(money.state.balance).toBe(100);
  });

  it("is idempotent per request id: a repeat is refused, not charged twice", async () => {
    const { app, fetchImpl, money } = setup(customer, () => usageBody(1000, 1000));
    const request = () => ({
      ...chat(),
      headers: { ...headers, "Idempotency-Key": "req-12345678" },
    });
    expect((await app.request("/v1/chat/completions", request())).status).toBe(200);
    const after = money.state.balance;
    const again = await app.request("/v1/chat/completions", request());
    expect(again.status).toBe(409);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(money.state.balance).toBe(after);
    expect(money.state.settled.size).toBe(1);
  });

  it("settles a stream from the final usage chunk", async () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n',
      'data: {"choices":[],"usage":{"prompt_tokens":1000000,"completion_tokens":100000,"total_tokens":1100000}}\n\n',
      "data: [DONE]\n\n",
    ].join("");
    const { app, money } = setup(customer, () => new Response(sse), undefined, fakeBilling(100));
    const res = await app.request("/v1/chat/completions", chat({ stream: true }));
    expect(res.status).toBe(200);
    expect(money.state.settled.size).toBe(0); // nothing settled until the stream is read
    expect(await res.text()).toContain("[DONE]");
    expect([...money.state.settled.values()][0]?.totalCost).toBeCloseTo(2, 6);
    expect(money.state.balance).toBeCloseTo(98, 6);
  });

  it("charges the held worst case when a success carries no readable usage", async () => {
    const { app, money } = setup(
      customer,
      () =>
        new Response(JSON.stringify({ choices: [] }), {
          headers: { "content-type": "application/json" },
        }),
    );
    expect((await app.request("/v1/chat/completions", chat({ max_tokens: 100 }))).status).toBe(200);
    const entry = [...money.state.settled.values()][0];
    expect(entry?.metadata.unpriced).toBe("usage_unreadable");
    expect(entry?.totalCost).toBeGreaterThan(0);
  });

  it("refuses a model with no published price instead of serving it free", async () => {
    vi.stubEnv("KCQ_AI_PUBLIC_MODEL", "unpriced");
    const { app, fetchImpl } = setup(customer);
    const res = await app.request("/v1/chat/completions", chat());
    expect(res.status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("KCQ wallet read", () => {
  const walletHeaders = { "X-KCQ-Workspace": "org_1" };
  function walletApp(
    identity: KcqAiIdentity | null,
    resolveWalletTenant: (request: Request) => Promise<string> = async () => "tenant_org",
  ) {
    const wallet = {
      balance: vi.fn(async (_tenantId: string) => ({ balance: 4.25, currency: "USD" })),
      recent: vi.fn(async (_tenantId: string, _limit: number) => [
        {
          id: "u1",
          occurredAt: "2026-10-09T10:00:00.000Z",
          model: "gpt-5.6-luna",
          promptTokens: 10,
          completionTokens: 5,
          cost: 0.0002,
          currency: "USD",
        },
      ]),
    } satisfies KcqWalletReader;
    const app = createKcqAiRoutes({
      resolveIdentity: async () => identity,
      resolveWalletTenant,
      wallet,
    });
    return { app, wallet };
  }

  it("requires a session", async () => {
    const { app, wallet } = walletApp(null);
    expect((await app.request("/v1/wallet")).status).toBe(401);
    expect(wallet.balance).not.toHaveBeenCalled();
  });

  it("returns the balance and recent KCQ usage of the resolved workspace tenant", async () => {
    const resolve = vi.fn(async (_request: Request) => "tenant_org");
    const { app, wallet } = walletApp({ userId: "cust1", staffRole: null }, resolve);
    const res = await app.request("/v1/wallet", { headers: walletHeaders });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      internal: false,
      balance: 4.25,
      currency: "USD",
      offerId: "kcq_topup",
    });
    expect(body.usage).toHaveLength(1);
    expect(resolve.mock.calls[0]?.[0].headers.get("X-KCQ-Workspace")).toBe("org_1");
    expect(wallet.balance).toHaveBeenCalledWith("tenant_org");
    expect(wallet.recent).toHaveBeenCalledWith("tenant_org", expect.any(Number));
  });

  it("refuses a workspace the caller does not belong to without reading any wallet", async () => {
    const { app, wallet } = walletApp({ userId: "cust1", staffRole: null }, async () => {
      throw new MarketSourceError(403, "当前工作区已不可访问。");
    });
    const res = await app.request("/v1/wallet", { headers: walletHeaders });
    expect(res.status).toBe(403);
    expect(wallet.balance).not.toHaveBeenCalled();
    expect(wallet.recent).not.toHaveBeenCalled();
  });

  it("tells staff they are not billed instead of showing a balance", async () => {
    const resolve = vi.fn(async () => "tenant_org");
    const { app, wallet } = walletApp({ userId: "s1", staffRole: "platform_operator" }, resolve);
    const res = await app.request("/v1/wallet", { headers: walletHeaders });
    expect(await res.json()).toEqual({ internal: true, billed: false });
    expect(wallet.balance).not.toHaveBeenCalled();
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
