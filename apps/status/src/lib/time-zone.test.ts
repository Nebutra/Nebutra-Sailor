import { describe, expect, it } from "vitest";
import { safeNext, validTimeZone } from "./time-zone";

describe("validTimeZone", () => {
  it("accepts IANA zones and rejects junk", () => {
    expect(validTimeZone("Asia/Shanghai")).toBe("Asia/Shanghai");
    expect(validTimeZone("UTC")).toBe("UTC");
    expect(validTimeZone("Mars/Base")).toBeNull();
    expect(validTimeZone(undefined)).toBeNull();
  });
});

describe("safeNext", () => {
  it("keeps same-site paths and refuses open redirects", () => {
    expect(safeNext("/p/demo/history")).toBe("/p/demo/history");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});
