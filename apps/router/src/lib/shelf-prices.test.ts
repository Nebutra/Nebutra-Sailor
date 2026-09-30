import type { RouterPriceRow } from "@nebutra/repositories";
import { describe, expect, it } from "vitest";
import type { ListingModel } from "./listing-catalog";
import { applyPublishedPrices } from "./shelf-prices";

function model(over: Partial<ListingModel> = {}): ListingModel {
  return {
    publicModel: "gpt-image-2.5-flare",
    name: "gpt-image-2.5-flare",
    description: "",
    category: "multimodal",
    provider: "openai",
    context: "—",
    inputPerMTok: 0,
    outputPerMTok: 0,
    routes: [],
    routed: false,
    sellable: true,
    source: "models.dev",
    ...over,
  } as ListingModel;
}

function price(over: Partial<RouterPriceRow> = {}): RouterPriceRow {
  return {
    modelName: "gpt-image-2.5-flare",
    unit: "PER_1M_TOKENS",
    currency: "USD",
    published: true,
    isActive: true,
    inputPerMTok: 8 * 1.3,
    outputPerMTok: 30 * 1.3,
    cacheReadPerMTok: null,
    cacheWritePerMTok: null,
    unitPrice: null,
    ...over,
  };
}

describe("applyPublishedPrices — supply availability gate (ADR 2026-09-30)", () => {
  it("drops a model from the shelf when supply capability says it is not sellable", () => {
    const models = [model()];
    const prices = new Map([["gpt-image-2.5-flare", price()]]);
    const availability = new Map([["gpt-image-2.5-flare", { sellable: false }]]);

    const [result] = applyPublishedPrices(models, prices, availability);
    expect(result?.sellable).toBe(false);
    // Prices still restate correctly — the gate only touches sellability.
    expect(result?.inputPerMTok).toBeCloseTo(10.4, 5);
  });

  it("keeps a model sellable when supply capability confirms it, or reports no data", () => {
    const models = [model()];
    const prices = new Map([["gpt-image-2.5-flare", price()]]);

    const available = new Map([["gpt-image-2.5-flare", { sellable: true }]]);
    expect(applyPublishedPrices(models, prices, available)[0]?.sellable).toBe(true);

    // No availability row at all (not yet discovered) fails open — the
    // existing inventory-based `sellable` from listing-catalog.ts still wins.
    expect(applyPublishedPrices(models, prices, new Map())[0]?.sellable).toBe(true);
    expect(applyPublishedPrices(models, prices)[0]?.sellable).toBe(true);
  });

  it("never turns an already-unsellable listing sellable — the gate only removes, never grants", () => {
    const models = [model({ sellable: false })];
    const prices = new Map([["gpt-image-2.5-flare", price()]]);
    const availability = new Map([["gpt-image-2.5-flare", { sellable: true }]]);
    expect(applyPublishedPrices(models, prices, availability)[0]?.sellable).toBe(false);
  });

  it("a model with no published price keeps zero rates and is still gated", () => {
    const models = [model()];
    const availability = new Map([["gpt-image-2.5-flare", { sellable: false }]]);
    const [result] = applyPublishedPrices(models, new Map(), availability);
    expect(result?.inputPerMTok).toBe(0);
    expect(result?.sellable).toBe(false);
  });
});
