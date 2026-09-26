import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  configureOffers,
  DEFAULT_OFFERS,
} from "../../../packages/commerce/billing/src/offers/index";

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

  it("passes the gateway's own boot validation", () => {
    try {
      expect(() => configureOffers(offers as never)).not.toThrow();
    } finally {
      configureOffers(DEFAULT_OFFERS);
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

  it("sells Kuanlan and Para as memberships plus credit packs, like 剪映 and LibTV", () => {
    for (const product of ["kuanlan", "para"]) {
      const mine = offers.filter((o) => o.product === product);
      const memberships = mine.filter((o) => o.fulfillment.type === "membership");
      const packs = mine.filter((o) => o.fulfillment.type === "credits");
      expect(memberships.length, product).toBeGreaterThan(0);
      expect(packs.length, product).toBeGreaterThan(0);
      for (const m of memberships) {
        const { tier, days, monthlyCredits } = m.fulfillment.params as Record<string, unknown>;
        expect(typeof tier, m.id).toBe("string");
        expect([30, 365], m.id).toContain(days);
        expect(monthlyCredits, m.id).toSatisfy(
          (n: unknown) => Number.isInteger(n) && (n as number) > 0,
        );
      }
      // Purchased credits last two years at 剪映, CapCut and 即梦.
      for (const p of packs) expect(p.fulfillment.params.expiresInDays, p.id).toBe(730);
    }
  });

  it("prices every fixed offer in both currencies, so neither rail is left out", () => {
    for (const offer of offers.filter((o) => o.prices)) {
      expect(Object.keys(offer.prices ?? {}).sort(), offer.id).toEqual(["CNY", "USD"]);
    }
  });

  it("bills each product to the account its benchmark does", () => {
    // Kuanlan is a consumer app like 剪映: what a person buys is theirs. Para is
    // a team workspace. A Router key belongs to whichever account is active.
    const expected: Record<string, string> = {
      kuanlan: "personal",
      para: "organization",
      router: "workspace",
    };
    for (const offer of offers) {
      expect((offer as { account?: string }).account, offer.id).toBe(expected[offer.product]);
    }
  });

  it("reaches the gateway on every deploy", () => {
    const deploy = readFileSync(resolve(ROOT, ".github/workflows/deploy-fly-gateway.yml"), "utf-8");
    expect(deploy).toContain("ops/nebutra/offers.json");
    expect(deploy).toMatch(/--env BILLING_OFFERS_JSON=/);
  });
});
