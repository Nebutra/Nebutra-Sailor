import { describe, expect, it } from "vitest";
import hero from "../hero/cached-bars.json";
import comparison from "./comparison-bars.json";

describe("agent replay comparison series", () => {
  it("covers the hero's trading days with real CSI 300 closes", () => {
    expect(comparison.symbol).toBe("000300");
    expect(comparison.bars.map(([timestamp]) => timestamp)).toEqual(hero.bars.map(([timestamp]) => timestamp));
    const missing = comparison.bars.filter(([, close]) => close === null).length;
    expect(missing).toBeLessThanOrEqual(3);
    for (const [, close] of comparison.bars) if (close !== null) expect(close).toBeGreaterThan(1000);
  });
});
