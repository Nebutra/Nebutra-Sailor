import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "glob";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

interface GovernancePolicy {
  componentTierCoverage: {
    primitivesRoot: string;
    tiers: Array<{
      name: string;
      requiredCoverage: number;
      components: string[];
    }>;
  };
}

function loadGovernancePolicy(): GovernancePolicy {
  const policyPath = resolve(ROOT, "governance/ui-governance.v1.json");
  const raw = readFileSync(policyPath, "utf-8");
  return JSON.parse(raw) as GovernancePolicy;
}

function findStoryFile(componentName: string, primitivesRoot: string): string | null {
  const pattern = resolve(ROOT, primitivesRoot, `${componentName}.stories.tsx`);
  const matches = globSync(pattern);
  return matches[0] ?? null;
}

describe("Storybook Coverage: Tier-1 Components", () => {
  const policy = loadGovernancePolicy();
  const tier1 = policy.componentTierCoverage.tiers.find((t) => t.name === "tier-1");

  it("governance policy contains a tier-1 definition", () => {
    expect(tier1).toBeDefined();
  });

  if (!tier1) {
    return;
  }

  const { primitivesRoot } = policy.componentTierCoverage;
  const missing: string[] = [];

  for (const component of tier1.components) {
    it(`tier-1 component "${component}" has a .stories.tsx file`, () => {
      const storyPath = findStoryFile(component, primitivesRoot);
      if (!storyPath) {
        missing.push(component);
      }
      expect(
        storyPath,
        `Missing story for tier-1 component "${component}". ` +
          `Expected file at: ${primitivesRoot}/${component}.stories.tsx`,
      ).not.toBeNull();
    });
  }

  it("reports all missing tier-1 stories (summary)", () => {
    // Re-check all components to build the full missing list for the summary
    const allMissing = tier1.components.filter(
      (component) => !findStoryFile(component, primitivesRoot),
    );

    if (allMissing.length > 0) {
      const report = [
        `${allMissing.length} of ${tier1.components.length} tier-1 components are missing Storybook stories:`,
        ...allMissing.map((c) => `  - ${c}`),
      ].join("\n");

      expect(allMissing, report).toHaveLength(0);
    }
  });
});
