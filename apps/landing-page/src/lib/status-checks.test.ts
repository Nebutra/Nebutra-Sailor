import { afterEach, describe, expect, it, vi } from "vitest";
import { getStatusSnapshot } from "./status-checks";

describe("getStatusSnapshot", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
