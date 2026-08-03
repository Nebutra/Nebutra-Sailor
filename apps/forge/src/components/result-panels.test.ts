import { describe, expect, it } from "vitest";
import { base64ToBytes, formatBytes } from "./result-panels-utils";

describe("result-panels helpers", () => {
  it("decodes base64 to bytes", () => {
    // "PDF" in ascii
    const bytes = base64ToBytes(btoa("PDF"));
    expect(Array.from(bytes)).toEqual([80, 68, 70]);
  });

  it("strips data-url prefix", () => {
    const payload = btoa("hi");
    const bytes = base64ToBytes(`data:application/pdf;base64,${payload}`);
    expect(new TextDecoder().decode(bytes)).toBe("hi");
  });

  it("formats byte sizes", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toMatch(/KB/);
    expect(formatBytes(2 * 1024 * 1024)).toMatch(/MB/);
  });
});
