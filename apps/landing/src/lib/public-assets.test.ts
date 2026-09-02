import { describe, expect, it } from "vitest";
import { landingPublicSrc } from "./public-assets";

describe("landingPublicSrc", () => {
  it("prefixes landing content onto the public CDN", () => {
    expect(landingPublicSrc("/images/about/hero-premium.png")).toBe(
      "https://cdn.nebutra.com/landing/images/about/hero-premium.png",
    );
    expect(landingPublicSrc("screenshots/demo-dashboard-command.webp")).toBe(
      "https://cdn.nebutra.com/landing/screenshots/demo-dashboard-command.webp",
    );
  });
});
