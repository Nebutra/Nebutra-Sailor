import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockQueryRaw = vi.fn();
const mockPing = vi.fn();

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => ({
    $queryRaw: mockQueryRaw,
  }),
}));

vi.mock("@nebutra/cache", () => ({
  getRedis: () => ({
    ping: mockPing,
  }),
}));

vi.mock("../services/circuitBreaker.js", () => ({
  aiServiceBreaker: {
    getStatus: vi.fn(async () => ({
      state: "CLOSED",
      failures: 0,
      successes: 0,
      openedAt: null,
    })),
  },
  billingServiceBreaker: {
    getStatus: vi.fn(async () => ({
      state: "CLOSED",
      failures: 0,
      successes: 0,
      openedAt: null,
    })),
  },
}));

import { statusRoutes } from "../routes/system/status.js";

const originalAiServiceUrl = process.env.AI_SERVICE_URL;

function getStatus() {
  return statusRoutes.request("/status", { method: "GET" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
  mockPing.mockResolvedValue("PONG");
  process.env.AI_SERVICE_URL = "https://ai.example.test";
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (originalAiServiceUrl === undefined) {
    delete process.env.AI_SERVICE_URL;
  } else {
    process.env.AI_SERVICE_URL = originalAiServiceUrl;
  }
});

describe("GET /status", () => {
  it("clears service timeout timers when an upstream health fetch rejects", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("socket closed")));

    const res = await getStatus();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.services.ai).toBe("unavailable");
    expect(vi.getTimerCount()).toBe(0);
  });
});
