import { describe, expect, it } from "vitest";
import { generatableModes, generationCost } from "./generation";

describe("generation", () => {
  it("offers every mode the origin now generates", () => {
    expect(generatableModes(true)).toEqual(["image", "video", "text", "audio"]);
    expect(generatableModes(false)).toEqual(["image", "video", "text", "audio"]);
  });

  it("quotes the gateway's price table, per output", () => {
    expect(generationCost("image")).toBe(10);
    expect(generationCost("image", 4)).toBe(40);
    expect(generationCost("text")).toBe(1);
  });

  it("quotes video per second of the model, snapped like the charge", () => {
    expect(generationCost("video")).toBe(65);
    expect(generationCost("video", 1, { durationSeconds: "10s" })).toBe(130);
    expect(generationCost("video", 1, { model: "wan-2.7", resolution: "1080P" })).toBe(105);
  });
});
