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

describe("logo visibility classes", () => {
  it("never sets an inline display on the outer element, so hidden/dark:hidden classes win", async () => {
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { Logo, Logomark } = await import("./Logo");
    for (const node of [
      createElement(Logo, { variant: "en", size: 120, className: "hidden md:block" }),
      createElement(Logomark, { variant: "mono", size: 32, className: "dark:hidden" }),
    ]) {
      const html = renderToStaticMarkup(node);
      const outer = html.slice(0, html.indexOf(">") + 1);
      expect(outer).not.toMatch(/display\s*:/);
    }
  });
});
