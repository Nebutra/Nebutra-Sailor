import { describe, expect, it } from "vitest";
import { contrastLevel, contrastRatio } from "../contrast";

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for a colour on itself", () => {
    expect(contrastRatio("0 0% 0%", "0 0% 100%")).toBeCloseTo(21, 1);
    expect(contrastRatio("220 14% 96%", "220 14% 96%")).toBeCloseTo(1, 5);
  });

  it("matches a known pair: House ink on white", () => {
    // #18191c on #ffffff is 17.9:1
    expect(contrastRatio("225 7.7% 10.2%", "0 0% 100%")).toBeCloseTo(17.9, 0);
  });

  it("returns null for a value that is not channels", () => {
    expect(contrastRatio("#fff", "0 0% 0%")).toBeNull();
  });

  it("grades normal text", () => {
    expect(contrastLevel(7.2)).toBe("AAA");
    expect(contrastLevel(4.6)).toBe("AA");
    expect(contrastLevel(3)).toBe("Fail");
  });
});
