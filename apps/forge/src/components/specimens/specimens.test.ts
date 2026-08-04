import { describe, expect, it } from "vitest";
import {
  cnIdCardSegments,
  filePaperStats,
  formatCardGroups,
  gtinSegments,
  ibanSegments,
  isbnSegments,
  splitJwtParts,
  usccSegments,
  vinSegments,
} from "./specimen-utils";

describe("segments", () => {
  it("id card", () => {
    expect(cnIdCardSegments("11010519491231002X").segments.map((s) => s.value)).toEqual([
      "110105",
      "19491231",
      "002",
      "X",
    ]);
  });
  it("uscc", () => {
    expect(usccSegments("91500000059926748X").segments.map((s) => s.value)).toEqual([
      "9",
      "1",
      "500000",
      "059926748",
      "X",
    ]);
  });
  it("iban", () => {
    expect(ibanSegments("GB82 WEST 1234 5698 7654 32").segments.map((s) => s.value)).toEqual([
      "GB",
      "82",
      "WEST12345698765432",
    ]);
  });
  it("vin", () => {
    expect(vinSegments("1M8GDM9AXKP042788").complete).toBe(true);
  });
  it("isbn13/10", () => {
    expect(isbnSegments("978-0-306-40615-7").kind).toBe("isbn13");
    expect(isbnSegments("0-306-40615-2").kind).toBe("isbn10");
  });
  it("gtin", () => {
    expect(gtinSegments("4006381333931").segments.map((s) => s.value)).toEqual([
      "400638133393",
      "1",
    ]);
  });
  it("misc", () => {
    expect(formatCardGroups("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(splitJwtParts("a.b.c")).toEqual(["a", "b", "c"]);
    expect(filePaperStats("a\nb").lines).toBe(2);
  });
});
