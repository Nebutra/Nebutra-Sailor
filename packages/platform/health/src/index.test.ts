import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpCheck, type HealthChecker, runHealthChecks } from "./index";

const originalFetch = globalThis.fetch;

describe("createHttpCheck", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("passes a platform timeout signal to fetch", async () => {
    const signal = new AbortController().signal;
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(signal);
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock as typeof fetch;

    const checker = createHttpCheck("api", "https://status.example.test", {
      expectedStatus: 204,
      timeout: 1234,
    });

    await checker.check();

    expect(timeoutSpy).toHaveBeenCalledWith(1234);
    expect(fetchMock).toHaveBeenCalledWith("https://status.example.test", {
      method: "GET",
      signal,
    });
  });
});

describe("runHealthChecks", () => {
  it("caps checker execution concurrency", async () => {
    let active = 0;
    let completed = 0;
    let maxActive = 0;
    const releaseQueue: Array<() => void> = [];

    const checkers: HealthChecker[] = Array.from({ length: 12 }, (_, index) => ({
      name: `check-${index}`,
      check: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);

        await new Promise<void>((resolve) => {
          releaseQueue.push(resolve);
        });

        active -= 1;
        completed += 1;
        return {
          status: "pass",
          latency_ms: 1,
        };
      },
    }));

    const resultPromise = runHealthChecks(checkers);

    while (releaseQueue.length < 8) {
      await Promise.resolve();
    }

    expect(maxActive).toBeLessThanOrEqual(8);

    while (completed < checkers.length) {
      while (releaseQueue.length > 0) {
        releaseQueue.shift()?.();
      }
      await Promise.resolve();
    }

    const result = await resultPromise;
    expect(result.status).toBe("healthy");
    expect(Object.keys(result.checks)).toHaveLength(12);
  });
});
