import { afterEach, describe, expect, it, vi } from "vitest";
import { getStatusSnapshot } from "./status-checks";

describe("getStatusSnapshot", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("caps concurrent service probes to avoid status page request bursts", async () => {
    let active = 0;
    let maxActive = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        active += 1;
        maxActive = Math.max(maxActive, active);

        await new Promise((resolve) => setTimeout(resolve, 0));

        active -= 1;
        const url = String(input);
        const isApiReady = url.includes("/misc/ready");
        return new Response(isApiReady ? JSON.stringify({ ready: true }) : "ok", {
          headers: {
            "content-type": isApiReady ? "application/json" : "text/plain",
          },
          status: 200,
        });
      }),
    );

    const snapshot = await getStatusSnapshot();

    expect(snapshot.overall).toBe("operational");
    expect(snapshot.services).toHaveLength(4);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("probes the API readiness route and reads { ready: true } as operational", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const isApiReady = url.endsWith("/misc/ready");
      return new Response(isApiReady ? JSON.stringify({ ready: true }) : "ok", {
        headers: { "content-type": isApiReady ? "application/json" : "text/plain" },
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await getStatusSnapshot();
    const api = snapshot.services.find((service) => service.id === "api");

    expect(fetchMock.mock.calls.map(([input]) => String(input))).toContain(api?.url);
    expect(api?.url.endsWith("/misc/ready")).toBe(true);
    expect(api?.url).not.toContain("/system/status");
    expect(api?.state).toBe("operational");
    expect(api?.note).toBe("API ready");
  });

  it("reports the API as degraded when readiness fails on the rate-limit store", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const isApiReady = String(input).endsWith("/misc/ready");
        if (!isApiReady) {
          return new Response("ok", { headers: { "content-type": "text/plain" }, status: 200 });
        }
        return new Response(JSON.stringify({ ready: false, failing: ["redis"] }), {
          headers: { "content-type": "application/json" },
          status: 503,
        });
      }),
    );

    const snapshot = await getStatusSnapshot();
    const api = snapshot.services.find((service) => service.id === "api");

    expect(api?.statusCode).toBe(503);
    expect(api?.state).toBe("degraded");
    expect(api?.note).toBe("API not ready: redis");
    expect(snapshot.overall).toBe("degraded");
  });

  it("reports the API as an outage when readiness fails on the database", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const isApiReady = String(input).endsWith("/misc/ready");
        if (!isApiReady) {
          return new Response("ok", { headers: { "content-type": "text/plain" }, status: 200 });
        }
        return new Response(JSON.stringify({ ready: false, failing: ["database", "redis"] }), {
          headers: { "content-type": "application/json" },
          status: 503,
        });
      }),
    );

    const snapshot = await getStatusSnapshot();
    const api = snapshot.services.find((service) => service.id === "api");

    expect(api?.state).toBe("outage");
    expect(api?.note).toBe("API not ready: database, redis");
    expect(snapshot.overall).toBe("outage");
  });

  it("still understands the older status contract if the probe is pointed back at it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const isApiReady = String(input).endsWith("/misc/ready");
        return new Response(isApiReady ? JSON.stringify({ status: "degraded" }) : "ok", {
          headers: { "content-type": isApiReady ? "application/json" : "text/plain" },
          status: 200,
        });
      }),
    );

    const snapshot = await getStatusSnapshot();
    const api = snapshot.services.find((service) => service.id === "api");

    expect(api?.state).toBe("degraded");
    expect(api?.note).toBe("API reports degraded");
  });

  it("treats platform timeout errors as degraded probes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("Timed out", "TimeoutError");
      }),
    );

    const snapshot = await getStatusSnapshot();

    expect(snapshot.overall).toBe("degraded");
    expect(snapshot.services).toHaveLength(4);
    expect(snapshot.services.every((service) => service.state === "degraded")).toBe(true);
    expect(
      snapshot.services.every((service) => service.note === "Timed out before the health deadline"),
    ).toBe(true);
  });
});
