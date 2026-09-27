import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const featureHeroSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/features/FeatureHero.tsx"),
  "utf8",
);

describe("FeatureHero visual governance", () => {
  it("keeps the aurora layer full-bleed instead of boxed by content width", () => {
    // It bleeds to the content column: it sits outside the max-w-wide section,
    // in a wrapper as wide as the column. A w-screen layer centred on the page
    // overflowed by the rail's width on the Nebutra site.
    const aurora = featureHeroSource.indexOf("<AuroraBackground");
    const section = featureHeroSource.indexOf("max-w-wide");
    expect(aurora).toBeGreaterThan(-1);
    expect(aurora).toBeLessThan(section);
    expect(featureHeroSource).not.toContain("w-screen");
  });
});
