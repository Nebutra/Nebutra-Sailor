import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LARGE_FEATURES } from "../components/landing/features/features-data";

const featureCardSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/features/FeatureBentoCard.tsx"),
  "utf8",
);
const featuresPageSource = readFileSync(
  path.join(process.cwd(), "src/app/[lang]/(marketing)/features/page.tsx"),
  "utf8",
);

describe("landing UI governance", () => {
  it("keeps feature exploration CTAs semantic and localized", () => {
    expect(featureCardSource).toContain("<a");
    expect(featureCardSource).toContain("href={href}");
    expect(featuresPageSource).toContain('t("sections.exploreFeature")');
    expect(featureCardSource).not.toContain(">Explore feature<");
    expect(featureCardSource).not.toContain("t: any");
    expect(featureCardSource).not.toContain("FeatureTranslator");
  });

  it("routes every large feature card to a canonical docs page", () => {
    expect(LARGE_FEATURES.length).toBeGreaterThan(0);

    for (const feature of LARGE_FEATURES) {
      expect(feature.href).toMatch(/^https:\/\/nebutra\.com\/docs\/[a-z0-9/-]+$/);
    }
  });
});
