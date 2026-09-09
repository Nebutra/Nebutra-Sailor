import { describe, expect, it } from "vitest";
import { type ModelPriceRow, priceUsage, reserveWorstCase } from "./pricing";

function row(over: Partial<ModelPriceRow> = {}): ModelPriceRow {
  return { modelName: "m", unit: "PER_1M_TOKENS", ...over };
}

describe("priceUsage — token models", () => {
  const tokens = row({ inputPerMTok: 3, outputPerMTok: 15 });

  it("prices input and output per 1M tokens", () => {
    const r = priceUsage("m", { promptTokens: 1000, completionTokens: 500 }, tokens);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 1000/1e6*3 = 0.003 ; 500/1e6*15 = 0.0075
    expect(r.totalCost).toBe(0.0105);
    expect(r.quantity).toBe(1500);
    expect(r.unitCost).toBe(0.000007);
    expect(r.currency).toBe("USD");
  });

  it("splits cached prompt tokens out of input and bills the cache-read rate", () => {
    const r = priceUsage(
      "m",
      { promptTokens: 1000, cachedPromptTokens: 800, completionTokens: 0 },
      row({ inputPerMTok: 3, outputPerMTok: 15, cacheReadPerMTok: 0.3 }),
    );
    if (!r.ok) throw new Error("expected priced");
    // 200 fresh @3 = 0.0006 ; 800 cached @0.3 = 0.00024
    expect(r.totalCost).toBe(0.00084);
    expect(r.components.map((c) => c.kind)).toEqual(["input", "output", "cache_read"]);
  });

  it("bills cache writes separately", () => {
    const r = priceUsage(
      "m",
      { promptTokens: 100, cacheWriteTokens: 1000 },
      row({ inputPerMTok: 3, outputPerMTok: 15, cacheWritePerMTok: 3.75 }),
    );
    if (!r.ok) throw new Error("expected priced");
    expect(r.totalCost).toBe(round((100 / 1e6) * 3 + (1000 / 1e6) * 3.75));
  });

  it("falls back to the input rate when no cache price is configured", () => {
    const r = priceUsage("m", { promptTokens: 1000, cachedPromptTokens: 1000 }, tokens);
    if (!r.ok) throw new Error("expected priced");
    expect(r.totalCost).toBe(0.003);
  });

  it("never double-charges a cached prompt token", () => {
    const r = priceUsage("m", { promptTokens: 500, cachedPromptTokens: 500 }, tokens);
    if (!r.ok) throw new Error("expected priced");
    expect(r.components.find((c) => c.kind === "input")?.quantity).toBe(0);
  });

  it("reports missing_price when a token rate is null", () => {
    const r = priceUsage("m", { promptTokens: 10 }, row({ inputPerMTok: 3 }));
    expect(r).toMatchObject({ ok: false, reason: "missing_price" });
  });
});

describe("priceUsage — non-token units", () => {
  it("PER_CALL defaults to one call", () => {
    const r = priceUsage("m", {}, row({ unit: "PER_CALL", unitPrice: 0.02 }));
    if (!r.ok) throw new Error("expected priced");
    expect(r.totalCost).toBe(0.02);
    expect(r.quantity).toBe(1);
    expect(r.unitCost).toBe(0.02);
  });

  it("PER_IMAGE multiplies by image count", () => {
    const r = priceUsage("m", { images: 4 }, row({ unit: "PER_IMAGE", unitPrice: 0.04 }));
    if (!r.ok) throw new Error("expected priced");
    expect(r.totalCost).toBe(0.16);
  });

  it("PER_SECOND multiplies by seconds", () => {
    const r = priceUsage("m", { seconds: 12.5 }, row({ unit: "PER_SECOND", unitPrice: 0.0004 }));
    if (!r.ok) throw new Error("expected priced");
    expect(r.totalCost).toBe(0.005);
  });

  it("PER_MINUTE multiplies by minutes", () => {
    const r = priceUsage("m", { minutes: 3 }, row({ unit: "PER_MINUTE", unitPrice: 0.006 }));
    if (!r.ok) throw new Error("expected priced");
    expect(r.totalCost).toBe(0.018);
  });

  it("PER_PAGE multiplies by pages", () => {
    const r = priceUsage("m", { pages: 20 }, row({ unit: "PER_PAGE", unitPrice: 0.0015 }));
    if (!r.ok) throw new Error("expected priced");
    expect(r.totalCost).toBe(0.03);
  });

  it("PER_1M_CHARS prices per million characters", () => {
    const r = priceUsage("m", { chars: 250_000 }, row({ unit: "PER_1M_CHARS", unitPrice: 16 }));
    if (!r.ok) throw new Error("expected priced");
    expect(r.totalCost).toBe(4);
  });

  it("FREE prices to zero but still reports quantity", () => {
    const r = priceUsage("m", { promptTokens: 900 }, row({ unit: "FREE" }));
    if (!r.ok) throw new Error("expected priced");
    expect(r.totalCost).toBe(0);
    expect(r.quantity).toBe(900);
  });

  it("a non-token unit with no unitPrice is missing_price, not zero", () => {
    const r = priceUsage("m", { images: 1 }, row({ unit: "PER_IMAGE" }));
    expect(r).toMatchObject({ ok: false, reason: "missing_price" });
  });
});

describe("priceUsage — unpriced models are refusable", () => {
  it("no row at all is unknown_model", () => {
    const r = priceUsage("ghost", { promptTokens: 10 }, null);
    expect(r).toMatchObject({ ok: false, reason: "unknown_model", model: "ghost" });
    expect("totalCost" in r).toBe(false);
  });

  it("PASS_THROUGH is not a price this resolver can produce", () => {
    const r = priceUsage("m", {}, row({ unit: "PASS_THROUGH" }));
    expect(r).toMatchObject({ ok: false, reason: "pass_through" });
  });
});

describe("rounding", () => {
  it("settles at 6 decimal places", () => {
    const r = priceUsage(
      "m",
      { promptTokens: 1, completionTokens: 1 },
      row({
        inputPerMTok: 3.333333,
        outputPerMTok: 7.777777,
      }),
    );
    if (!r.ok) throw new Error("expected priced");
    expect(r.totalCost.toString()).toBe(
      r.totalCost.toFixed(6).replace(/0+$/, "").replace(/\.$/, ""),
    );
    expect(r.totalCost).toBeLessThan(0.00002);
  });
});

describe("reserveWorstCase", () => {
  it("reserves prompt plus the max-output ceiling", () => {
    const r = reserveWorstCase(
      "m",
      { promptTokens: 1000, maxOutputTokens: 4096 },
      row({ inputPerMTok: 3, outputPerMTok: 15 }),
    );
    if (!r.ok) throw new Error("expected priced");
    expect(r.totalCost).toBe(round((1000 / 1e6) * 3 + (4096 / 1e6) * 15));
  });

  it("propagates the unpriced refusal", () => {
    expect(reserveWorstCase("m", { promptTokens: 1 }, null)).toMatchObject({
      ok: false,
      reason: "unknown_model",
    });
  });
});

function round(n: number): number {
  return Math.round((n + Number.EPSILON) * 1e6) / 1e6;
}
