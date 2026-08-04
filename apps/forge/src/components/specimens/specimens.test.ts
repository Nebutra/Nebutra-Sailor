import { describe, expect, it } from "vitest";
import {
  cnIdCardSegments,
  filePaperStats,
  formatCardGroups,
  splitJwtParts,
} from "./specimen-utils";

describe("cnIdCardSegments", () => {
  it("splits a full 18-char id", () => {
    const { cleaned, complete, segments } = cnIdCardSegments("11010519491231002X");
    expect(cleaned).toBe("11010519491231002X");
    expect(complete).toBe(true);
    expect(segments.map((s) => s.value)).toEqual(["110105", "19491231", "002", "X"]);
  });
});

describe("formatCardGroups", () => {
  it("groups digits by 4", () => {
    expect(formatCardGroups("4111111111111111")).toBe("4111 1111 1111 1111");
  });
});

describe("splitJwtParts", () => {
  it("splits three segments", () => {
    expect(splitJwtParts("aaa.bbb.ccc")).toEqual(["aaa", "bbb", "ccc"]);
  });
});

describe("filePaperStats", () => {
  it("counts empty and lines", () => {
    expect(filePaperStats("")).toEqual({ lines: 0, chars: 0 });
    expect(filePaperStats("a\nb\n").lines).toBe(3);
  });
});
