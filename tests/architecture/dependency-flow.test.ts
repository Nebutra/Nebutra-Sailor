import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

type Layer = "design" | "platform" | "iam" | "commerce" | "integrations" | "ai" | "ops" | "app";

interface WorkspacePackage {
  name: string;
  pkgJsonPath: string;
  layer: Layer;
}

function categoryToLayer(category: string): Layer {
  if (category === "design") return "design";
  if (category === "platform") return "platform";
  if (category === "iam") return "iam";
  if (category === "commerce") return "commerce";
  if (category === "integrations") return "integrations";
  if (category === "ai") return "ai";
  if (category === "ops") return "ops";
  return "platform";
}

/**
 * Walk packages/<category>/<name> and apps/<name>; return all @nebutra/*
 * workspace members. Auto-discovery means the test self-updates when new
 * packages land — only directional invariants are enforced.
 */
function discoverWorkspacePackages(): WorkspacePackage[] {
  const results: WorkspacePackage[] = [];

  const packagesRoot = resolve(ROOT, "packages");
  for (const cat of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    const catDir = resolve(packagesRoot, cat.name);
    for (const pkg of readdirSync(catDir, { withFileTypes: true })) {
      if (!pkg.isDirectory()) continue;
      const pkgJsonPath = resolve(catDir, pkg.name, "package.json");
      try {
        const json: PackageJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
        if (json.name?.startsWith("@nebutra/")) {
          results.push({
            name: json.name,
            pkgJsonPath: `packages/${cat.name}/${pkg.name}/package.json`,
            layer: categoryToLayer(cat.name),
          });
        }
      } catch {
        /* not a workspace member */
      }
    }
  }

  const appsRoot = resolve(ROOT, "apps");
  for (const app of readdirSync(appsRoot, { withFileTypes: true })) {
    if (!app.isDirectory()) continue;
    const pkgJsonPath = resolve(appsRoot, app.name, "package.json");
    try {
      const json: PackageJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
      if (json.name?.startsWith("@nebutra/")) {
        results.push({
          name: json.name,
          pkgJsonPath: `apps/${app.name}/package.json`,
          layer: "app",
        });
      }
    } catch {
      /* not a workspace member */
    }
  }

  return results;
}

function readNebutraWorkspaceDeps(pkgJsonPath: string): string[] {
  const raw = readFileSync(resolve(ROOT, pkgJsonPath), "utf-8");
  const pkg: PackageJson = JSON.parse(raw);
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  return Object.entries(all)
    .filter(([name, version]) => name.startsWith("@nebutra/") && version === "workspace:*")
    .map(([name]) => name);
}

function readRuntimeNebutraDeps(pkgJsonPath: string): string[] {
  const raw = readFileSync(resolve(ROOT, pkgJsonPath), "utf-8");
  const pkg: PackageJson = JSON.parse(raw);
  return Object.entries(pkg.dependencies ?? {})
    .filter(([name, version]) => name.startsWith("@nebutra/") && version === "workspace:*")
    .map(([name]) => name);
}

/**
 * Directional invariants (auto-enforced; no allow-lists to maintain).
 *
 * - Apps may depend on any package.
 * - Packages may depend on packages but NOT on apps.
 * - Design-layer packages (ui / brand / icons / tokens / design-tokens / theme)
 *   stay leaf at runtime: they may not have runtime deps in iam / commerce /
 *   integrations / ai layers.
 * - Every @nebutra/* workspace reference must resolve to a real package.
 */
describe("Dependency Flow Conformance (directional, auto-discovered)", () => {
  const packages = discoverWorkspacePackages();
  const layerByName = new Map<string, Layer>(packages.map((p) => [p.name, p.layer]));

  it("workspace discovery finds packages", () => {
    expect(packages.length).toBeGreaterThan(10);
  });

  it("every @nebutra/* workspace reference resolves to a real package", () => {
    const names = new Set(packages.map((p) => p.name));
    const violations: string[] = [];
    for (const pkg of packages) {
      for (const dep of readNebutraWorkspaceDeps(pkg.pkgJsonPath)) {
        if (!names.has(dep)) {
          violations.push(`${pkg.name} → ${dep} (target missing in workspace)`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("no package depends on an @nebutra/* app", () => {
    const appNames = new Set(packages.filter((p) => p.layer === "app").map((p) => p.name));
    const violations: string[] = [];
    for (const pkg of packages) {
      if (pkg.layer === "app") continue;
      for (const dep of readNebutraWorkspaceDeps(pkg.pkgJsonPath)) {
        if (appNames.has(dep)) {
          violations.push(`${pkg.name} → ${dep}`);
        }
      }
    }
    expect(violations, "packages must not depend on apps").toEqual([]);
  });

  /**
   * Documented arcs we tolerate while the architecture catches up. Each entry
   * is a pinned exception with a reason — adding here requires intent, not
   * convenience.
   */
  const TOLERATED_CROSS_LAYER_ARCS = new Set<string>([
    // node-graph-canvas component in ui imports ReelGraph types from reel.
    // Long-term fix: move reel types to peer dep or extract canvas package.
    "@nebutra/ui→@nebutra/reel",
  ]);

  it("design-layer packages don't have business-domain runtime deps", () => {
    const business = new Set<Layer>(["iam", "commerce", "integrations", "ai", "app"]);
    const violations: string[] = [];
    for (const pkg of packages.filter((p) => p.layer === "design")) {
      for (const dep of readRuntimeNebutraDeps(pkg.pkgJsonPath)) {
        const depLayer = layerByName.get(dep);
        if (depLayer && business.has(depLayer)) {
          if (TOLERATED_CROSS_LAYER_ARCS.has(`${pkg.name}→${dep}`)) continue;
          violations.push(`${pkg.name} → ${dep} (${depLayer})`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("@nebutra/ui runtime deps stay narrow (design/platform/ops only)", () => {
    const ui = packages.find((p) => p.name === "@nebutra/ui");
    expect(ui).toBeDefined();
    if (!ui) return;
    const business = new Set<Layer>(["iam", "commerce", "integrations", "ai", "app"]);
    const violations = readRuntimeNebutraDeps(ui.pkgJsonPath).filter((d) => {
      const layer = layerByName.get(d);
      if (layer === undefined || !business.has(layer)) return false;
      return !TOLERATED_CROSS_LAYER_ARCS.has(`${ui.name}→${d}`);
    });
    expect(violations).toEqual([]);
  });
});
