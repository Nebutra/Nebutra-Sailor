// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emitBrowserEvent } from "./emit";

describe("emitBrowserEvent", () => {
  const sendBeacon = vi.fn();

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://analytics.example");
    window.sessionStorage.clear();
    sendBeacon.mockReturnValue(true);
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends PostHog capture payloads with a top-level distinct_id", async () => {
    emitBrowserEvent("checkout", {
      action: "started",
      tier: "STARTUP",
    });

    expect(sendBeacon).toHaveBeenCalledWith("https://analytics.example/capture/", expect.any(Blob));
    const [, blob] = sendBeacon.mock.calls[0] as [string, Blob];
    const payload = JSON.parse(await blob.text());

    expect(payload).toMatchObject({
      api_key: "phc_test",
      event: "checkout",
      properties: {
        action: "started",
        tier: "STARTUP",
      },
    });
    expect(payload.distinct_id).toMatch(/^anon_/);
    expect(payload.properties.distinct_id).toBe(payload.distinct_id);
  });

  it("reports fallback fetch failures without throwing", async () => {
    const error = new Error("network down");
    const onError = vi.fn();
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));

    expect(() => emitBrowserEvent("checkout", {}, { onError })).not.toThrow();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(error);
  });
});
