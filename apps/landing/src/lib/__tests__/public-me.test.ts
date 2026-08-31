import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPublicMe, resetPublicMeCache } from "../public-me";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("loadPublicMe", () => {
  beforeEach(() => {
    resetPublicMeCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetPublicMeCache();
    vi.unstubAllGlobals();
  });

  it("asks the app host with credentials and caches the in-flight request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        name: "Tseka Luk",
        email: "tseka@nebutra.com",
        avatarUrl: null,
        activeOrganization: null,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([loadPublicMe(), loadPublicMe()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/me\/public$/),
      expect.objectContaining({ credentials: "include" }),
    );
    expect(first?.name).toBe("Tseka Luk");
    expect(second?.name).toBe("Tseka Luk");
  });

  it("returns null when the session is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "Not authenticated" }, 401)),
    );

    await expect(loadPublicMe()).resolves.toBeNull();
  });
});
