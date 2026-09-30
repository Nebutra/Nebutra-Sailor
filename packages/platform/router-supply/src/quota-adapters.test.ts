import { describe, expect, it, vi } from "vitest";
import type { NewApiSessionClient } from "./discovery";
import {
  fetchCliProxyUsage,
  fetchNewApiChannelUsage,
  fetchOpenAiCompatibleBalance,
} from "./quota-adapters";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("fetchCliProxyUsage", () => {
  it("refuses without a managementKey", async () => {
    const result = await fetchCliProxyUsage({ baseUrl: "http://x" });
    expect(result.ok).toBe(false);
    expect(result.note).toMatch(/managementKey/);
  });

  it("aggregates a ratio per provider when the quota field's shape is recognized", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        files: [
          { provider: "codex", quota: { used: 3, limit: 10 } },
          { provider: "codex", quota: { used: 2, limit: 5 } },
          { provider: "anthropic", quota: { limit: 20, remaining: 15 } },
          { provider: "codex", disabled: true, quota: { used: 999, limit: 999 } },
        ],
      }),
    );
    const result = await fetchCliProxyUsage(
      { baseUrl: "http://x", managementKey: "m" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    const codex = result.windows.find((w) => w.name === "codex");
    expect(codex).toMatchObject({ unit: "REQUESTS", used: 5, limit: 15 });
    const anthropic = result.windows.find((w) => w.name === "anthropic");
    expect(anthropic).toMatchObject({ used: 5, limit: 20 });
    expect(result.note).toMatch(/ratio available for 2/);
  });

  it("falls back to a bare request count when the quota field's shape is not recognized (stated gap)", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        files: [
          { provider: "codex", recent_requests: 12, quota: { some_unknown_shape: true } },
          { provider: "codex", recent_requests: 3 },
        ],
      }),
    );
    const result = await fetchCliProxyUsage(
      { baseUrl: "http://x", managementKey: "m" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    expect(result.windows).toEqual([
      { name: "codex", unit: "REQUESTS", limit: null, used: 15, resetsAt: null },
    ]);
    expect(result.note).toMatch(/count-only for 1/);
  });

  it("reads the soonest next_retry_after as the window's reset", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        files: [
          { provider: "codex", recent_requests: 1, next_retry_after: "2026-09-30T05:00:00Z" },
          { provider: "codex", recent_requests: 1, next_retry_after: "2026-09-30T02:00:00Z" },
        ],
      }),
    );
    const result = await fetchCliProxyUsage(
      { baseUrl: "http://x", managementKey: "m" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.windows[0]?.resetsAt?.toISOString()).toBe("2026-09-30T02:00:00.000Z");
  });

  it("surfaces an HTTP failure", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 500 }));
    const result = await fetchCliProxyUsage(
      { baseUrl: "http://x", managementKey: "m" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    expect(result.note).toContain("500");
  });
});

describe("fetchNewApiChannelUsage", () => {
  function session(
    channel: { id: number; models?: string; used_quota?: number } | null,
  ): NewApiSessionClient {
    return {
      login: vi.fn(async () => ({ cookie: "c", userId: "1" })),
      findChannel: vi.fn(async () => channel),
    };
  }

  it("refuses without a channelName", async () => {
    const result = await fetchNewApiChannelUsage({ baseUrl: "http://x" }, session(null));
    expect(result.ok).toBe(false);
    expect(result.note).toMatch(/channelName/);
  });

  it("reports not-found when the channel does not exist", async () => {
    const result = await fetchNewApiChannelUsage(
      { baseUrl: "http://x", channelName: "goat" },
      session(null),
    );
    expect(result.ok).toBe(false);
    expect(result.note).toMatch(/not found/);
  });

  it("reports the gap honestly when used_quota is present but no quotaPerUnitUsd is configured", async () => {
    const result = await fetchNewApiChannelUsage(
      { baseUrl: "http://x", channelName: "goat" },
      session({ id: 1, used_quota: 500_000 }),
    );
    expect(result.ok).toBe(true);
    expect(result.windows).toEqual([]);
    expect(result.note).toMatch(/quotaPerUnitUsd/);
  });

  it("converts used_quota to USD when quotaPerUnitUsd is configured", async () => {
    const result = await fetchNewApiChannelUsage(
      { baseUrl: "http://x", channelName: "goat", quotaPerUnitUsd: 500_000 },
      session({ id: 1, used_quota: 500_000 }),
    );
    expect(result.ok).toBe(true);
    expect(result.windows).toEqual([
      { name: "balance", unit: "USD", limit: null, used: 1, resetsAt: null },
    ]);
  });

  it("reports no window at all when the channel carries no used_quota field", async () => {
    const result = await fetchNewApiChannelUsage(
      { baseUrl: "http://x", channelName: "goat", quotaPerUnitUsd: 500_000 },
      session({ id: 1 }),
    );
    expect(result.ok).toBe(true);
    expect(result.windows).toEqual([]);
  });

  it("surfaces a session failure", async () => {
    const failingSession: NewApiSessionClient = {
      login: vi.fn(async () => {
        throw new Error("bad password");
      }),
      findChannel: vi.fn(),
    };
    const result = await fetchNewApiChannelUsage(
      { baseUrl: "http://x", channelName: "goat" },
      failingSession,
    );
    expect(result.ok).toBe(false);
    expect(result.note).toContain("bad password");
  });
});

describe("fetchOpenAiCompatibleBalance", () => {
  it("refuses without balanceEndpoint/balanceShape", async () => {
    const result = await fetchOpenAiCompatibleBalance({ baseUrl: "http://x" });
    expect(result.ok).toBe(false);
    expect(result.note).toMatch(/no standard balance API/);
  });

  it("reads the openai_credit_grants shape", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse({ total_granted: 100, total_used: 40, total_available: 60 }),
    );
    const result = await fetchOpenAiCompatibleBalance(
      {
        baseUrl: "http://x",
        apiKey: "k",
        balanceEndpoint: "/dashboard/billing/credit_grants",
        balanceShape: "openai_credit_grants",
      },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    expect(result.windows).toEqual([
      { name: "balance", unit: "USD", limit: 100, used: 40, resetsAt: null },
    ]);
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer k");
  });

  it("derives used from granted - available when total_used is absent", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ total_granted: 100, total_available: 60 }));
    const result = await fetchOpenAiCompatibleBalance(
      { baseUrl: "http://x", balanceEndpoint: "/x", balanceShape: "openai_credit_grants" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.windows[0]?.used).toBe(40);
  });

  it("reads the generic_available_used shape", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ total_available: 60, total_usage: 40 }));
    const result = await fetchOpenAiCompatibleBalance(
      { baseUrl: "http://x", balanceEndpoint: "/balance", balanceShape: "generic_available_used" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    expect(result.windows).toEqual([
      { name: "balance", unit: "USD", limit: 100, used: 40, resetsAt: null },
    ]);
  });

  it("reports the shape mismatch honestly", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ unrelated: true }));
    const result = await fetchOpenAiCompatibleBalance(
      { baseUrl: "http://x", balanceEndpoint: "/balance", balanceShape: "generic_available_used" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    expect(result.note).toMatch(/did not match/);
  });

  it("surfaces an HTTP failure", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 401 }));
    const result = await fetchOpenAiCompatibleBalance(
      { baseUrl: "http://x", balanceEndpoint: "/balance", balanceShape: "generic_available_used" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    expect(result.note).toContain("401");
  });
});
