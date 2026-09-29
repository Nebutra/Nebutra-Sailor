import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FONT_REGISTRY } from "./index";

/**
 * ./next.ts is a next/font compile-time transform, so it is read as TEXT: the
 * point is what the build will do, and the build must not need the network.
 */
const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const SOURCE = readFileSync(here("./next.ts"), "utf8");
const faces = [
  ...SOURCE.matchAll(
    /const (\w+) = localFont\(\{\s*src: \[\s*\{\s*path: "([^"]+)",\s*weight: "(\d+ \d+)",\s*style: "normal",\s*\},\s*\],\s*display: "swap",\s*(?:adjustFontFallback: "Times New Roman",\s*)?declarations: \[\{ prop: "font-family", value: "'([^']+)'" \}\],\s*(?:adjustFontFallback: "Times New Roman",\s*)?variable: "(--font-[\w-]+)",/g,
  ),
].map(([, name = "", path = "", weight = "", family = "", variable = ""]) => ({
  name,
  path,
  weight,
  family,
  variable,
}));

describe("registry faces (@nebutra/fonts/next)", () => {
  it("never fetches from Google at build or dev time", () => {
    expect(SOURCE).not.toMatch(/from\s+["']next\/font\/google["']/);
    expect(SOURCE).toContain('import localFont from "next/font/local";');
  });

  it("declares every face the registry list exports", () => {
    const listed = /FONT_REGISTRY_FACES = \[([^\]]+)\]/.exec(SOURCE)?.[1] ?? "";
    const names = listed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    expect(names).toHaveLength(19);
    expect(faces.map((f) => f.name).sort()).toEqual([...names].sort());
  });

  it("loads each face from the package's own vendored generated/registry/ (not node_modules)", () => {
    // Package-relative, not `../node_modules/@fontsource-variable/...`: that
    // path only existed because pnpm nests a workspace package's own deps
    // under its own node_modules. A hoisted `npm install` of the published
    // package resolves @fontsource-variable/* elsewhere, so the woff2 bytes
    // are vendored into the package itself (scripts/copy-registry-fonts.mjs)
    // and referenced from a path that resolves the same everywhere.
    for (const { path } of faces) {
      expect(path).toMatch(/^\.\.\/generated\/registry\/([a-z0-9-]+)-latin-wght-normal\.woff2$/);
      expect(existsSync(here(path)), path).toBe(true);
    }
  });

  it("depends on every @fontsource-variable package it vendors from, pinned (devDependency)", () => {
    const pkg = JSON.parse(readFileSync(here("../package.json"), "utf8")) as {
      devDependencies: Record<string, string>;
    };
    for (const { path } of faces) {
      const fileName = /registry\/([a-z0-9-]+)-latin-wght-normal\.woff2$/.exec(path)?.[1] ?? "";
      const name = `@fontsource-variable/${fileName}`;
      expect(pkg.devDependencies[name], name).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("ships the vendored registry woff2 files in the npm `files` list", () => {
    const pkg = JSON.parse(readFileSync(here("../package.json"), "utf8")) as {
      files: string[];
    };
    expect(pkg.files).toContain("generated/registry");
  });

  it("keeps the variables FONT_REGISTRY resolves to, and distinct family names", () => {
    const registryVars = new Set(Object.values(FONT_REGISTRY));
    for (const { variable } of faces) expect(registryVars.has(variable), variable).toBe(true);
    const families = faces.map((f) => f.family);
    expect(new Set(families).size).toBe(families.length);
    // The brand heading face in ./next-cjk is family "dmSans"; the registry's
    // must not share it, or one @font-face family serves two files.
    expect(families).not.toContain("dmSans");
  });
});
