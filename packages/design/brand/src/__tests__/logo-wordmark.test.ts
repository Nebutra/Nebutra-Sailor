import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * A project fresh from `brand:init` has no logo files and no CDN. The logo
 * used to render as a broken <img> pointing at cdn.<its domain> in the navbar
 * and footer of every new site; brand:init now sets `logo: "wordmark"` and the
 * components set the name in type instead.
 */
describe("Logo for a brand without logo files", () => {
  it("renders the name, not an image", async () => {
    vi.resetModules();
    vi.doMock("../metadata", async (orig) => {
      const real = await orig<typeof import("../metadata")>();
      return { ...real, brand: { ...real.brand, name: "Acme", logo: "wordmark" } };
    });
    const { Logo, Logomark, Wordmark } = await import("../components/Logo");
    const logo = renderToStaticMarkup(createElement(Logo, { variant: "en", size: 120 }));
    expect(logo).toContain("Acme");
    expect(logo).not.toContain("<img");
    expect(renderToStaticMarkup(createElement(Wordmark, {}))).toContain("Acme");
    const mark = renderToStaticMarkup(createElement(Logomark, { size: 32 }));
    expect(mark).toContain(">A<");
    expect(mark).not.toContain("<img");
    vi.doUnmock("../metadata");
  });

  it("keeps the official SVGs for a brand that has them", async () => {
    vi.resetModules();
    const { Logo } = await import("../components/Logo");
    expect(renderToStaticMarkup(createElement(Logo, { variant: "en", size: 120 }))).toContain("<img");
  });
});
