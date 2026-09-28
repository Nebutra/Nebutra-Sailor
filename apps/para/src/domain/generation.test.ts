import { describe, expect, it } from "vitest";
import { generatableModes, generationCost } from "./generation";

describe("generation", () => {
  it("offers only what the origin generates when talking to the gateway", () => {
    expect(generatableModes(true)).toEqual(["image", "text"]);
    expect(generatableModes(false)).toEqual(["image", "video", "text", "audio"]);
  });

  it("quotes the gateway's price table, per output", () => {
    expect(generationCost("image")).toBe(10);
    expect(generationCost("image", 4)).toBe(40);
    expect(generationCost("text")).toBe(1);
  });
});
