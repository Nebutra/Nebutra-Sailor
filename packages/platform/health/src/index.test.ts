import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpCheck, type HealthChecker, nextHealthRoute, runHealthChecks } from "./index";

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

describe("nextHealthRoute", () => {
  it("serves the HealthCheckResult shape with the service name and no-store", async () => {
    const GET = nextHealthRoute({ service: "router", version: "1.2.3" });
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toContain("application/json");

    const body = (await response.json()) as Record<string, unknown>;
    expect(body.service).toBe("router");
    expect(body.status).toBe("healthy");
    expect(body.version).toBe("1.2.3");
    expect(typeof body.timestamp).toBe("string");
    expect(body.checks).toEqual({});
  });

  it("returns 200 when degraded and 503 when unhealthy", async () => {
    const warn: HealthChecker = {
      name: "warn",
      check: async () => ({ status: "warn", latency_ms: 1, message: "slow" }),
    };
    const fail: HealthChecker = {
      name: "fail",
      check: async () => ({ status: "fail", latency_ms: 1, message: "down" }),
    };

    const degraded = await nextHealthRoute({ service: "svc", checkers: [warn] })();
    expect(degraded.status).toBe(200);
    expect(((await degraded.json()) as { status: string }).status).toBe("degraded");

    const unhealthy = await nextHealthRoute({ service: "svc", checkers: [warn, fail] })();
    expect(unhealthy.status).toBe(503);
    const body = (await unhealthy.json()) as { status: string; checks: Record<string, unknown> };
    expect(body.status).toBe("unhealthy");
    expect(body.checks.fail).toEqual({ status: "fail", latency_ms: 1, message: "down" });
  });
});
