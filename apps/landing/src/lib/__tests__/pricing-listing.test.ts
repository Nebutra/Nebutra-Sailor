import { describe, expect, it } from "vitest";
import { listedOffers } from "../pricing-listing";
import type { PublicOffer } from "../public-offers";

const base = { account: "personal", kind: "credits", grants: { credits: 1 }, name: "x" } as const;

describe("pricing listing", () => {
  it("leaves unlisted products off the public price page", () => {
    const offers: PublicOffer[] = [
      { ...base, id: "a", product: "kuanlan", prices: { USD: 1 } },
      { ...base, id: "b", product: "para", prices: { USD: 1 } },
    ];
    expect(listedOffers(offers).map((o) => o.id)).toEqual(["b"]);
  });
});
