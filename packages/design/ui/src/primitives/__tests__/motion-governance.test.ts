import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(join(process.cwd(), "src", "primitives", relativePath), "utf8");

const designFile = (relativePath: string) =>
  readFileSync(join(process.cwd(), "..", relativePath), "utf8");

describe("primitive motion governance", () => {
  it("keeps Loader on the canonical tokenized loading primitives", () => {
    const loaderSource = source("loader.tsx");

    expect(loaderSource).not.toMatch(/animate-\[[^\]]*\d+(?:\.\d+)?s/gu);
    expect(loaderSource).not.toMatch(/animation:\s*`[^`]*\d+(?:\.\d+)?s/gu);
    expect(loaderSource).not.toMatch(/@keyframes|const KEYFRAMES|@media \(prefers-reduced-motion/u);
  });

  it.each([
    "progress.tsx",
    "toggle-group.tsx",
  ] as const)("does not use transition-all in %s", (relativePath) => {
    expect(source(relativePath)).not.toMatch(/\btransition-all\b/u);
  });

  it("keeps Progress fill geometry inside its track", () => {
    const progressSource = source("progress.tsx");

    expect(progressSource).toMatch(/scaleX/u);
    expect(progressSource).toMatch(/transformOrigin:\s*"left center"/u);
    expect(progressSource).not.toMatch(/translateX\(/u);
  });

  it.each([
    "design-tokens/static/base.css",
    "tokens/styles.css",
  ] as const)("keeps the global border default in Tailwind base layer: %s", (relativePath) => {
    expect(designFile(relativePath)).toMatch(
      /@layer\s+base\s*\{\s*\*,\s*\*::before,\s*\*::after\s*\{[^}]*border-color:\s*hsl\(var\(--border\)\);/su,
    );
  });

  it.each([
    "command-menu-parts.tsx",
    "dialog.tsx",
    "dropdown-menu.tsx",
    "popover.tsx",
    "tooltip.tsx",
  ] as const)("centralizes overlay depth and motion tokens in %s", (relativePath) => {
    const content = source(relativePath);

    expect(content).toMatch(/overlay(ClassNames|ZIndex)/u);
    expect(content).not.toMatch(/\bz-50\b/u);
    expect(content).not.toMatch(/\bduration-(?:200|300)\b/u);
    expect(content).not.toMatch(/\bshadow-2xl\b/u);
    expect(content).not.toMatch(/\bshadow-xl\b/u);
    expect(content).not.toMatch(/\brounded-xl\b/u);
    expect(content).not.toMatch(/\brounded-2xl\b/u);
  });
});
