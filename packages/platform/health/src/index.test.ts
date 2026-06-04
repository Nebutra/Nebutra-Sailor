import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpCheck } from "./index";

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
