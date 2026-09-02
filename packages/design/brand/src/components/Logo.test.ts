import { describe, expect, it } from "vitest";
import { brand } from "../metadata";
import { logoPublicSrc } from "./Logo";

describe("logoPublicSrc", () => {
  it("serves classic marks from the brand CDN", () => {
    expect(logoPublicSrc("color", "classic")).toBe(
      `https://${brand.domains.cdn}/brand/logo/logo-color.svg`,
    );
    expect(logoPublicSrc("horizontal-en", "classic")).toBe(
      `https://${brand.domains.cdn}/brand/logo/logo-horizontal-en.svg`,
    );
  });

  it("routes compliant and mono-only variants to logo-compliant", () => {
    expect(logoPublicSrc("color", "compliant")).toBe(
      `https://${brand.domains.cdn}/brand/logo-compliant/logo-color.svg`,
    );
    expect(logoPublicSrc("horizontal-en-mono", "classic")).toBe(
      `https://${brand.domains.cdn}/brand/logo-compliant/logo-horizontal-en-mono.svg`,
    );
  });
});
