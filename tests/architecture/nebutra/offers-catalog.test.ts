import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/**
 * Nebutra's price list is data (ADR 2026-09-27 product wallets): it lives in
 * ops/nebutra/offers.json and reaches the gateway as BILLING_OFFERS_JSON on
 * every deploy. The gateway validates it at boot and refuses to start on a bad
 * one — these checks fail the PR first, where the mistake is cheap.
 */
type Range = { min: number; max: number };
type Offer = {
  id: string;
  product: string;
  prices?: Record<string, number>;
  customAmount?: Record<string, Range>;
  fulfillment: { type: string; params: Record<string, unknown> };
};

const offers = JSON.parse(
  readFileSync(resolve(ROOT, "ops/nebutra/offers.json"), "utf-8"),
) as Offer[];

describe("Nebutra offer catalog", () => {
  it("gives every offer a product, and exactly one way to be priced", () => {
    for (const offer of offers) {
      expect(offer.product, offer.id).toMatch(/^[a-z][a-z0-9-]{1,31}$/);
      expect(Boolean(offer.prices) !== Boolean(offer.customAmount), offer.id).toBe(true);
    }
  });

  it("has unique ids", () => {
    expect(new Set(offers.map((o) => o.id)).size).toBe(offers.length);
  });

  it("prices a balance top-up in every currency it accepts", () => {
    for (const offer of offers.filter((o) => o.fulfillment.type === "balance")) {
      const rates = offer.fulfillment.params.unitsPerMajor as Record<string, number>;
      for (const currency of Object.keys(offer.customAmount ?? offer.prices ?? {})) {
        expect(rates[currency], `${offer.id} ${currency}`).toBeGreaterThan(0);
      }
    }
  });

  it("sells Router as a prepaid USD balance with the benchmarks' $5 floor", () => {
    const topup = offers.find((o) => o.product === "router");
    expect(topup?.fulfillment.type).toBe("balance");
    expect(topup?.customAmount?.USD?.min).toBe(5);
  });

  it("reaches the gateway on every deploy", () => {
    const deploy = readFileSync(resolve(ROOT, ".github/workflows/deploy-fly-gateway.yml"), "utf-8");
    expect(deploy).toContain("ops/nebutra/offers.json");
    expect(deploy).toMatch(/--env BILLING_OFFERS_JSON=/);
  });
});
