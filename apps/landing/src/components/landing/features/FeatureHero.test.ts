import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const featureHeroSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/features/FeatureHero.tsx"),
  "utf8",
);

describe("FeatureHero visual governance", () => {
  it("keeps the aurora layer full-bleed instead of boxed by content width", () => {
    expect(featureHeroSource).toContain(
      'className="inset-y-0 left-1/2 right-auto w-screen -translate-x-1/2"',
    );
    expect(featureHeroSource).not.toContain(
      '<AuroraBackground variant={tokens.ambient} position="top" intensity={0.55} />',
    );
  });
});
