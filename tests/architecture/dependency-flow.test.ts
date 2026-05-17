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
  "@nebutra/auth",
  "@nebutra/brand",
  "@nebutra/design-tokens",
  "@nebutra/billing",
  "@nebutra/rate-limit",
  "@nebutra/cache",
  "@nebutra/event-bus",
  "@nebutra/marketing",
  "@nebutra/sanity",
  "@nebutra/preset",
  "@nebutra/i18n",
  "@nebutra/email",
  "@nebutra/auth",
  "@nebutra/billing",
  "@nebutra/license",
  "@nebutra/agents",
  "@nebutra/notifications",
  "@nebutra/analytics",
  "@nebutra/agent-runtime",
  "@nebutra/atelier-canvas",
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
 *   @nebutra/web            (apps/web):                 @nebutra/ui, @nebutra/tokens, @nebutra/icons, @nebutra/feature-flags, @nebutra/logger
 *   @nebutra/landing-page   (apps/landing-page):        @nebutra/ui, @nebutra/tokens, @nebutra/icons, @nebutra/logger
 *   @nebutra/design-docs    (apps/design-docs):         @nebutra/ui, @nebutra/tokens
 */
const DEPENDENCY_RULES: DependencyRule[] = [
  {
    name: "@nebutra/ui",
    packageJsonPath: "packages/design/ui/package.json",
    // @nebutra/design-tokens is a build-time-only devDependency: scripts/build-registry.ts
    // reads packages/design/design-tokens/build/ts/*.ts to generate the design-docs registry.
    // It is NOT imported by any runtime source under packages/design/ui/src — the leaf-package
    // invariant still holds at runtime. Declaring it as a workspace dep also lets Turbo's
    // ^build traversal sequence design-tokens before @nebutra/ui#build:registry, fixing an
    // ENOENT race where the registry script ran before design-tokens outputs were on disk.
    //
    // @nebutra/brand IS a runtime dependency: src/primitives/animate-in.tsx and
    // src/components/animate-in.tsx import { brandSpring, emerge, flow } for the shared
    // motion language; src/tokens/primitive.ts imports { colors } for the canonical
    // brand palette. Brand is the design-source-of-truth that ui consumes — keeping it
    // out of ui would force every consumer to import brand directly, which would defeat
    // ui's role as the integration point. Documented exception in the leaf-runtime test.
    allowedDeps: ["@nebutra/design-tokens", "@nebutra/brand", "@nebutra/icons", "@nebutra/tokens"],
  },
  {
    name: "@nebutra/web",
    packageJsonPath: "apps/web/package.json",
    // @nebutra/feature-flags and @nebutra/logger are cross-cutting infrastructure packages
    // @nebutra/icons is used directly by authenticated admin surfaces.
    // @nebutra/queue is an infrastructure dep used by /api/cron route handlers.
    // @nebutra/webhooks is consumed by /settings/webhooks management UI.
    // @nebutra/china-compliance powers ICP footer + WeChat OAuth scaffolding.
    // @nebutra/audit is the SOC 2-grade audit log infrastructure consumed by web routes.
    allowedDeps: [
      "@nebutra/ui",
      "@nebutra/tokens",
      "@nebutra/icons",
      "@nebutra/feature-flags",
      "@nebutra/logger",
      "@nebutra/queue",
      "@nebutra/webhooks",
      "@nebutra/china-compliance",
      "@nebutra/uploads",
      "@nebutra/audit",
      "@nebutra/metering",
      "@nebutra/onboarding",
      "@nebutra/design-tokens",
      "@nebutra/theme",
      "@nebutra/access-gate",
    ],
  },
  {
    name: "@nebutra/landing-page",
    packageJsonPath: "apps/landing-page/package.json",
    // @nebutra/icons is used directly for Geist icons in marketing components
    // @nebutra/logger is a cross-cutting infrastructure package, not a UI dep
    allowedDeps: [
      "@nebutra/ui",
      "@nebutra/tokens",
      "@nebutra/icons",
      "@nebutra/logger",
      "@nebutra/ai-providers",
    ],
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

  it("@nebutra/ui runtime stays narrow (only documented runtime workspace deps allowed)", () => {
    const uiRule = DEPENDENCY_RULES.find((r) => r.name === "@nebutra/ui");
    expect(uiRule).toBeDefined();
    if (!uiRule) return;

    // Runtime workspace deps that ui is allowed to import from src/. Anything
    // beyond this set must either move to devDependencies or be added here
    // alongside a comment in DEPENDENCY_RULES explaining the runtime need.
    const ALLOWED_RUNTIME_DEPS = new Set(["@nebutra/brand", "@nebutra/icons", "@nebutra/tokens"]);

    const raw = readFileSync(resolve(ROOT, uiRule.packageJsonPath), "utf-8");
    const pkg: PackageJson = JSON.parse(raw);
    const unexpectedRuntimeDeps = Object.entries(pkg.dependencies ?? {})
      .filter(
        ([name, version]) =>
          name.startsWith("@nebutra/") &&
          version === "workspace:*" &&
          !EXCLUDED_PACKAGES.has(name) &&
          !ALLOWED_RUNTIME_DEPS.has(name),
      )
      .map(([name]) => name);

    expect(unexpectedRuntimeDeps).toHaveLength(0);
  });
});
