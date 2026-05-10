import { describe, expect, it } from "vitest";
import { formatICPNumber, validateICPNumber } from "../icp";

describe("formatICPNumber", () => {
  it("trims whitespace and upper-cases the ICP segment", () => {
    expect(formatICPNumber("  京icp备12345678号-1  ")).toBe("京ICP备12345678号-1");
  });

  it("normalizes full-width digits", () => {
    expect(formatICPNumber("京ICP备１２３４５６７８号-1")).toBe("京ICP备12345678号-1");
  });

  it("normalizes em-dash and en-dash to hyphen", () => {
    expect(formatICPNumber("京ICP备12345678号—1")).toBe("京ICP备12345678号-1");
    expect(formatICPNumber("京ICP备12345678号–1")).toBe("京ICP备12345678号-1");
  });

  it("returns empty string when given a non-string", () => {
    // @ts-expect-error — runtime guard
    expect(formatICPNumber(null)).toBe("");
    // @ts-expect-error — runtime guard
    expect(formatICPNumber(undefined)).toBe("");
  });
});

describe("validateICPNumber", () => {
  it("accepts a canonical mainland ICP", () => {
    expect(validateICPNumber("京ICP备12345678号-1")).toBe(true);
  });

  it("accepts other province codes", () => {
    expect(validateICPNumber("沪ICP备87654321号-2")).toBe(true);
    expect(validateICPNumber("粤ICP备11112222号-10")).toBe(true);
  });

  it("accepts the older 證 / 证 variants", () => {
    expect(validateICPNumber("京ICP證12345678号-1")).toBe(true);
    expect(validateICPNumber("京ICP证12345678号-1")).toBe(true);
  });

  it("normalizes input before validating", () => {
    expect(validateICPNumber("  京icp备１２３４５６７８号-1  ")).toBe(true);
  });

  it("rejects missing suffix", () => {
    expect(validateICPNumber("京ICP备12345678号")).toBe(false);
  });

  it("rejects too-short digit body", () => {
    expect(validateICPNumber("京ICP备123号-1")).toBe(false);
  });

  it("rejects empty / non-string input", () => {
    expect(validateICPNumber("")).toBe(false);
    // @ts-expect-error — runtime guard
    expect(validateICPNumber(123)).toBe(false);
  });

  it("rejects garbage that looks vaguely similar", () => {
    expect(validateICPNumber("京ABC备12345678号-1")).toBe(false);
    expect(validateICPNumber("ICP备12345678号-1")).toBe(false);
  });
});
