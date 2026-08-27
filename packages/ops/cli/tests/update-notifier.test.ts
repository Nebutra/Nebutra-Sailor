import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLatestVersion } from "../src/utils/update-notifier.js";

describe("update notifier", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("clears the update-check timeout when fetch fails before the deadline", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(fetchLatestVersion()).resolves.toBeNull();

    expect(vi.getTimerCount()).toBe(0);
  });
});
