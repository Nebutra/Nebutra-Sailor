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
        const isApiStatus = url.includes("/system/status");
        return new Response(isApiStatus ? JSON.stringify({ status: "healthy" }) : "ok", {
          headers: {
            "content-type": isApiStatus ? "application/json" : "text/plain",
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
