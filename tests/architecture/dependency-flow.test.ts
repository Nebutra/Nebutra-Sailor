import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

/**
 * Excluded packages: tooling and non-design-system workspace packages.
 * These appear as workspace deps in app packages but are not part of
 * the UI dependency hierarchy under test.
 */
const EXCLUDED_PACKAGES = new Set([
  "@nebutra/tsconfig",
  "@nebutra/eslint-config",
  "@nebutra/db",
  "@nebutra/brand",
  "@nebutra/rate-limit",
  "@nebutra/cache",
  "@nebutra/event-bus",
  "@nebutra/marketing",
  "@nebutra/sanity",
  "@nebutra/preset",
  "@nebutra/i18n",
  "@nebutra/email",
]);

interface DependencyRule {
  name: string;
  packageJsonPath: string;
  allowedDeps: string[];
}

/**
 * Dependency rules based on actual package.json workspace deps.
 *
 * After architecture correction (Phase 1–2):
 *   @nebutra/ui             (packages/ui):              none (design-system merged in)
 *   @nebutra/web            (apps/web):                 @nebutra/ui, @nebutra/tokens, @nebutra/feature-flags, @nebutra/logger
 *   @nebutra/landing-page   (apps/landing-page):        @nebutra/ui, @nebutra/tokens
 *   @nebutra/design-docs    (apps/design-docs):         @nebutra/ui, @nebutra/tokens
 */
const DEPENDENCY_RULES: DependencyRule[] = [
  {
    name: "@nebutra/ui",
    packageJsonPath: "packages/ui/package.json",
    allowedDeps: [],
  },
  {
    name: "@nebutra/web",
    packageJsonPath: "apps/web/package.json",
    // @nebutra/feature-flags and @nebutra/logger are cross-cutting infrastructure packages
    allowedDeps: ["@nebutra/ui", "@nebutra/tokens", "@nebutra/feature-flags", "@nebutra/logger"],
  },
  {
    name: "@nebutra/landing-page",
    packageJsonPath: "apps/landing-page/package.json",
    // @nebutra/icons is used directly for Geist icons in marketing components
    // @nebutra/logger is a cross-cutting infrastructure package, not a UI dep
    allowedDeps: ["@nebutra/ui", "@nebutra/tokens", "@nebutra/icons", "@nebutra/logger"],
  },
  {
    name: "@nebutra/design-docs",
    packageJsonPath: "apps/design-docs/package.json",
    // design-docs is the icon-library documentation app; direct @nebutra/icons usage is intentional
    allowedDeps: ["@nebutra/ui", "@nebutra/tokens", "@nebutra/icons"],
  },
];

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Extract @nebutra/* workspace dependencies from a package.json,
 * excluding tooling/infrastructure packages that are not part of the
 * UI dependency flow.
 */
function getUIWorkspaceDeps(packageJsonRelativePath: string): string[] {
  const fullPath = resolve(ROOT, packageJsonRelativePath);
  const raw = readFileSync(fullPath, "utf-8");
  const pkg: PackageJson = JSON.parse(raw);

  const allDeps: Record<string, string> = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  return Object.entries(allDeps)
    .filter(([name, version]) => {
      return (
        name.startsWith("@nebutra/") && version === "workspace:*" && !EXCLUDED_PACKAGES.has(name)
      );
    })
    .map(([name]) => name);
}

describe("Property 4: Dependency Flow Conformance", () => {
  it("DEPENDENCY_RULES covers all expected UI packages", () => {
    expect(DEPENDENCY_RULES.length).toBe(4);
  });

  it("every UI package workspace deps are a subset of allowed deps", () => {
    fc.assert(
      fc.property(fc.constantFrom(...DEPENDENCY_RULES), (rule) => {
        const actualDeps = getUIWorkspaceDeps(rule.packageJsonPath);
        const allowedSet = new Set(rule.allowedDeps);

        for (const dep of actualDeps) {
          if (!allowedSet.has(dep)) {
            throw new Error(
              `Package "${rule.name}" has an unauthorized dependency on "${dep}". ` +
                `Allowed UI deps: [${rule.allowedDeps.join(", ") || "none"}]. ` +
                `This violates the unidirectional dependency flow invariant.`,
            );
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("@nebutra/ui has no @nebutra/* workspace dependencies (it is the leaf package)", () => {
    const uiRule = DEPENDENCY_RULES.find((r) => r.name === "@nebutra/ui");
    expect(uiRule).toBeDefined();
    if (!uiRule) return;

    const actualDeps = getUIWorkspaceDeps(uiRule.packageJsonPath);
    expect(actualDeps).toHaveLength(0);
  });
});
