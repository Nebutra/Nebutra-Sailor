import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listPublicCdnSeedObjects } from "./cdn-public-assets";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("listPublicCdnSeedObjects", () => {
  const keys = listPublicCdnSeedObjects(repoRoot).map((object) => object.key);

  it("seeds marketing stills, product marks, and brand logos", () => {
    expect(keys).toContain("landing/images/about/hero-premium.png");
    expect(keys).toContain("landing/screenshots/demo-dashboard-command.webp");
    expect(keys).toContain("landing/animations/hero.lottie");
    expect(keys).toContain("router/banners/router-banner-llm.png");
    expect(keys).toContain("router/product/router-repeater.png");
    expect(keys).toContain("forge/product/forge-anvil.png");
    expect(keys).toContain("pebble/assets/hero.jpg");
    expect(keys).toContain("brand/logo/logo-color.svg");
    expect(keys).toContain("brand/logo-compliant/logo-horizontal-en.svg");
  });

  it("does not seed favicons or leftover Next chrome", () => {
    expect(keys.some((key) => key.endsWith("favicon.ico"))).toBe(false);
    expect(keys.some((key) => key.includes("apple-touch-icon"))).toBe(false);
    expect(keys).not.toContain("landing/window.svg");
    expect(keys).not.toContain("landing/next.svg");
  });
});
