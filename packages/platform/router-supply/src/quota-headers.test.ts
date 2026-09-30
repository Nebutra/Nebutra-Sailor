import { describe, expect, it } from "vitest";
import {
  parseAnthropicRateLimitHeaders,
  parseForceExhaustedUntil,
  parseOpenAiRateLimitHeaders,
  parseOpenAiResetDuration,
  parseRetryAfter,
  parseUsageHeaders,
} from "./quota-headers";

describe("parseOpenAiResetDuration", () => {
  it("parses minutes+seconds", () => {
    const now = new Date("2026-09-30T00:00:00Z");
    const at = parseOpenAiResetDuration("6m0s", now);
    expect(at?.getTime()).toBe(now.getTime() + 6 * 60_000);
  });

  it("parses plain seconds", () => {
    const now = new Date("2026-09-30T00:00:00Z");
    expect(parseOpenAiResetDuration("1s", now)?.getTime()).toBe(now.getTime() + 1000);
  });

  it("parses milliseconds", () => {
    const now = new Date("2026-09-30T00:00:00Z");
    expect(parseOpenAiResetDuration("250ms", now)?.getTime()).toBe(now.getTime() + 250);
  });

  it("parses hours+minutes", () => {
    const now = new Date("2026-09-30T00:00:00Z");
    expect(parseOpenAiResetDuration("1h4m", now)?.getTime()).toBe(
      now.getTime() + 3_600_000 + 4 * 60_000,
    );
  });

  it("returns null for empty or unrecognized input", () => {
    expect(parseOpenAiResetDuration(null)).toBeNull();
    expect(parseOpenAiResetDuration("")).toBeNull();
    expect(parseOpenAiResetDuration("garbage")).toBeNull();
  });
});

describe("parseRetryAfter", () => {
  it("parses delta-seconds", () => {
    const now = new Date("2026-09-30T00:00:00Z");
    const at = parseRetryAfter({ "retry-after": "120" }, now);
    expect(at?.getTime()).toBe(now.getTime() + 120_000);
  });

  it("parses an HTTP-date", () => {
    const at = parseRetryAfter({ "retry-after": "Wed, 30 Sep 2026 01:00:00 GMT" });
    expect(at?.toISOString()).toBe("2026-09-30T01:00:00.000Z");
  });

  it("returns null when absent", () => {
    expect(parseRetryAfter({})).toBeNull();
  });

  it("reads off a real Headers object too", () => {
    const headers = new Headers({ "Retry-After": "30" });
    const now = new Date("2026-09-30T00:00:00Z");
    expect(parseRetryAfter(headers, now)?.getTime()).toBe(now.getTime() + 30_000);
  });
});

describe("parseOpenAiRateLimitHeaders", () => {
  it("reads request and token limits", () => {
    const now = new Date("2026-09-30T00:00:00Z");
    const signals = parseOpenAiRateLimitHeaders(
      {
        "x-ratelimit-limit-requests": "5000",
        "x-ratelimit-remaining-requests": "4999",
        "x-ratelimit-reset-requests": "6m0s",
        "x-ratelimit-limit-tokens": "160000",
        "x-ratelimit-remaining-tokens": "159000",
        "x-ratelimit-reset-tokens": "6s",
      },
      now,
    );
    expect(signals).toHaveLength(2);
    const requests = signals.find((s) => s.unit === "REQUESTS");
    expect(requests).toMatchObject({ limit: 5000, remaining: 4999 });
    expect(requests?.resetsAt?.getTime()).toBe(now.getTime() + 6 * 60_000);
    const tokens = signals.find((s) => s.unit === "TOKENS");
    expect(tokens).toMatchObject({ limit: 160000, remaining: 159000 });
  });

  it("returns nothing when no relevant headers are present", () => {
    expect(parseOpenAiRateLimitHeaders({})).toEqual([]);
  });
});

describe("parseAnthropicRateLimitHeaders", () => {
  it("reads requests, tokens, input-tokens, output-tokens", () => {
    const signals = parseAnthropicRateLimitHeaders({
      "anthropic-ratelimit-requests-limit": "50",
      "anthropic-ratelimit-requests-remaining": "10",
      "anthropic-ratelimit-requests-reset": "2026-09-30T01:00:00Z",
      "anthropic-ratelimit-input-tokens-limit": "40000",
      "anthropic-ratelimit-input-tokens-remaining": "39000",
    });
    expect(signals).toHaveLength(2);
    const requests = signals.find((s) => s.name === "requests");
    expect(requests?.resetsAt?.toISOString()).toBe("2026-09-30T01:00:00.000Z");
    const inputTokens = signals.find((s) => s.name === "input-tokens");
    expect(inputTokens).toMatchObject({ unit: "TOKENS", limit: 40000, remaining: 39000 });
  });
});

describe("parseUsageHeaders", () => {
  it("combines both shapes when both are present", () => {
    const signals = parseUsageHeaders({
      "x-ratelimit-limit-requests": "10",
      "anthropic-ratelimit-tokens-limit": "1000",
    });
    expect(signals.map((s) => s.name).sort()).toEqual(["requests", "tokens"]);
  });
});

describe("parseForceExhaustedUntil", () => {
  it("only fires on 429", () => {
    expect(parseForceExhaustedUntil(500, { "retry-after": "10" })).toBeNull();
  });

  it("returns the resolved instant on a header-less 429 with only retry-after", () => {
    const now = new Date("2026-09-30T00:00:00Z");
    const at = parseForceExhaustedUntil(429, { "retry-after": "5" }, now);
    expect(at?.getTime()).toBe(now.getTime() + 5000);
  });

  it("returns null when a 429 carries no retry-after at all", () => {
    expect(parseForceExhaustedUntil(429, {})).toBeNull();
  });
});
