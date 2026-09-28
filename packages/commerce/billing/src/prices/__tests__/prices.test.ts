import { describe, expect, it } from "vitest";
import {
  PARA_VIDEO_MODELS,
  paraGenerationCredits,
  paraVideoAutoModel,
  paraVideoQuote,
  parseDurationSeconds,
} from "../index";

describe("paraGenerationCredits", () => {
  it("prices image, text and audio per output", () => {
    expect(paraGenerationCredits("image")).toBe(10);
    expect(paraGenerationCredits("image", 4)).toBe(40);
    expect(paraGenerationCredits("text")).toBe(1);
    expect(paraGenerationCredits("audio")).toBe(20);
  });

  it("prices video per second of the resolved model", () => {
    // Auto → Wan 2.7 (the only available model), 720P default, 5 s default.
    expect(paraGenerationCredits("video")).toBe(65);
    expect(paraGenerationCredits("video", 1, { durationSeconds: 10 })).toBe(130);
    expect(paraGenerationCredits("video", 2, { durationSeconds: "10s" })).toBe(260);
    expect(
      paraGenerationCredits("video", 1, {
        model: "wan-2.7",
        durationSeconds: 5,
        resolution: "1080P",
      }),
    ).toBe(105);
  });

  it("snaps duration to what the model accepts", () => {
    expect(paraGenerationCredits("video", 1, { durationSeconds: 99 })).toBe(13 * 15);
    expect(paraGenerationCredits("video", 1, { durationSeconds: 0 })).toBe(13 * 2);
    expect(paraGenerationCredits("video", 1, { durationSeconds: "five" })).toBe(65);
  });

  it("quotes unpriced models at the fallback rate", () => {
    expect(paraGenerationCredits("video", 1, { model: "seedance-2.5" })).toBe(100);
  });
});

describe("paraVideoQuote", () => {
  it("resolves Auto to the first available priced model", () => {
    expect(paraVideoAutoModel()?.id).toBe("wan-2.7");
    expect(paraVideoQuote({ model: "Auto" })?.model.id).toBe("wan-2.7");
  });

  it("refuses planned and unknown models", () => {
    expect(paraVideoQuote({ model: "seedance-2.5" })).toBeNull();
    expect(paraVideoQuote({ model: "kling-3" })).toBeNull();
    expect(paraVideoQuote({ model: "Nano Banana" })).toBeNull();
  });

  it("falls back to the model's default resolution", () => {
    const q = paraVideoQuote({ model: "wan-2.7", resolution: "480P" });
    expect(q?.resolution).toBe("720P");
    expect(paraVideoQuote({ model: "wan-2.7", resolution: "1080p" })?.resolution).toBe("1080P");
  });

  it("every planned model has no price and every available one does", () => {
    for (const model of Object.values(PARA_VIDEO_MODELS)) {
      if (model.status === "planned") expect(model.creditsPerSecond).toBeNull();
      else
        for (const r of model.resolutions) expect(model.creditsPerSecond?.[r]).toBeGreaterThan(0);
    }
  });
});

describe("parseDurationSeconds", () => {
  it("is strict", () => {
    expect(parseDurationSeconds(5)).toBe(5);
    expect(parseDurationSeconds("5s")).toBe(5);
    expect(parseDurationSeconds(" 7.5 s ")).toBe(7.5);
    expect(parseDurationSeconds("5 seconds")).toBeNull();
    // Client input: a long whitespace run is refused outright, not backtracked over.
    const started = performance.now();
    expect(parseDurationSeconds(`0${"\t".repeat(50_000)}!`)).toBeNull();
    expect(performance.now() - started).toBeLessThan(50);
    expect(parseDurationSeconds("-5")).toBeNull();
    expect(parseDurationSeconds(Number.NaN)).toBeNull();
    expect(parseDurationSeconds(null)).toBeNull();
  });
});
