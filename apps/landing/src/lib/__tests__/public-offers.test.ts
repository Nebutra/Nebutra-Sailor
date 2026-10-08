import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPublicOffers } from "../public-offers";

const offer = {
  id: "kuanlan_pro_month",
  product: "kuanlan",
  name: "Pro · 1 month",
  account: "personal",
  kind: "membership",
  prices: { USD: 9.99, CNY: 79 },
  grants: { tier: "pro", days: 30, monthlyCredits: 3200 },
};

afterEach(() => vi.unstubAllGlobals());

describe("public pricing catalog", () => {
  it("uses the live checkout catalog without cookies or cached template prices", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ offers: [offer] }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await loadPublicOffers("https://api.example.com/")).toEqual([offer]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/billing/offers",
      expect.objectContaining({ cache: "no-store", credentials: "omit" }),
    );
  });

  it.each([503, 401])("refuses to substitute demo pricing after HTTP %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status })));
    await expect(loadPublicOffers("https://api.example.com")).rejects.toThrow();
  });

  it("rejects malformed prices and incomplete membership benefits", async () => {
    for (const bad of [
      { ...offer, prices: { USD: -1 } },
      { ...offer, grants: {} },
      { ...offer, prices: undefined, customAmount: { USD: { min: 10, max: 5 } } },
    ]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ offers: [bad] })));
      await expect(loadPublicOffers("https://api.example.com")).rejects.toThrow();
    }
  });
});
