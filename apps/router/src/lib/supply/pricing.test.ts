import { describe, expect, it } from "vitest";
import { coverageFor, MARGIN, priceOverrideFor } from "./price-overrides";

/**
 * The markup has to reach every published model, not only the hand-priced ones.
 *
 * It first lived inside the override table, written into each entry as
 * `ceiling × MARGIN`. Every other model took its numbers straight from the
 * public index — which is upstream's own list price — so four of the six models
 * on the shelf were being sold at exactly cost. After the ~7.8% that leaks
 * between charging and banking, selling at cost is a loss on every request.
 *
 * These assertions mirror `toRow`. They exist because that mistake is invisible
 * in review: the code read as though a price had been set, and it had — just
 * upstream's.
 */

/** The published rate for a model, as `toRow` computes it. */
function publishedRate(
  publicModel: string,
  provider: string,
  indexInput: number,
  indexOutput: number,
): { input: number; output: number } {
  const override = priceOverrideFor(publicModel);
  const cover = coverageFor(provider);
  return {
    input: (override?.inputPricePerMillion ?? indexInput * MARGIN) * cover.input,
    output: (override?.outputPricePerMillion ?? indexOutput * MARGIN) * cover.output,
  };
}

describe("every published rate carries the markup", () => {
  it("marks an index-priced model up, rather than selling it at upstream list", () => {
    // gpt-5.6-sol lists at $4 in / $20 out. Publishing those unchanged is cost.
    const rate = publishedRate("gpt-5.6-sol", "openai", 4, 20);
    expect(rate.input).toBeCloseTo(4 * MARGIN, 10);
    expect(rate.output).toBeCloseTo(20 * MARGIN, 10);
    expect(rate.input).toBeGreaterThan(4);
    expect(rate.output).toBeGreaterThan(20);
  });

  it("does not double the markup on an override, whose numbers already carry it", () => {
    // gpt-image-2.5-sunburst is written as 8 × MARGIN / 30 × MARGIN.
    const rate = publishedRate("gpt-image-2.5-sunburst", "openai", 0, 0);
    expect(rate.input).toBeCloseTo(8 * MARGIN, 10);
    expect(rate.output).toBeCloseTo(30 * MARGIN, 10);
  });

  it("stacks coverage on top of the markup for a provider that hides a dimension", () => {
    // Anthropic cache writes bill at 1.25x input and go unreported, so the
    // input rate carries both the markup and the coverage factor.
    const rate = publishedRate("claude-sonnet-5", "anthropic", 2, 10);
    expect(rate.input).toBeCloseTo(2 * MARGIN * 1.25, 10);
    expect(rate.output).toBeCloseTo(10 * MARGIN, 10);
  });

  it("publishes a clean rate that never rounds below the arithmetic", () => {
    const publishable = (rate: number) => Math.ceil(Number(rate.toPrecision(12)) * 1e6) / 1e6;
    // Binary residue sits above the true value; stripping it must not leave a
    // price like 15.600001 that nobody would write down.
    expect(publishable(12 * 1.3)).toBe(15.6);
    expect(publishable(0.14 * 1.3)).toBe(0.182);
    expect(publishable(0.75 * 1.3)).toBe(0.975);
    // A genuine value finer than the tick still rounds up, never down.
    expect(publishable(0.1234564)).toBe(0.123457);
    expect(publishable(0.1234564)).toBeGreaterThan(0.1234564);
  });

  it("keeps the markup above the break-even the leakage implies", () => {
    // (1−.02)(1−.03)(1−.02)(1−.01) = 0.9223 → break-even markup 1/0.9223.
    const leakage = 0.98 * 0.97 * 0.98 * 0.99;
    expect(MARGIN).toBeGreaterThan(1 / leakage);
    // And it must clear the 20% target after leakage, not before it.
    expect(MARGIN * leakage - 1).toBeGreaterThanOrEqual(0.19);
  });
});
