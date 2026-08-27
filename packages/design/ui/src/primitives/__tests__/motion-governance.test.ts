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

  it("keeps the command palette instant — no open/close transform or opacity", () => {
    const overlay = designFile("ui/src/tokens/components/overlay.ts");
    const commandBlock = overlay.match(/commandSurface:\s*\[[\s\S]*?\],/u)?.[0] ?? "";

    expect(commandBlock).toMatch(/commandSurface/u);
    expect(commandBlock).not.toMatch(/transition-/u);
    expect(commandBlock).not.toMatch(/data-starting-style:/u);
    expect(commandBlock).not.toMatch(/data-ending-style:/u);
    expect(commandBlock).not.toMatch(/scale-/u);
  });

  it("keeps hover transforms behind a fine-pointer hover variant in the recipe", () => {
    const recipe = designFile("tokens/recipe.css");

    expect(recipe).toMatch(/@custom-variant hover/u);
    expect(recipe).toMatch(/\(hover: hover\) and \(pointer: fine\)/u);
  });

  it("presses the canonical Button with a flow-rail brand ease and 0.97 scale", () => {
    const variants = source("button-variants.ts");

    expect(variants).toMatch(/active:scale-\[0\.97\]/u);
    expect(variants).toMatch(/duration-flow/u);
    expect(variants).toMatch(/ease-\[var\(--ease-brand\)\]/u);
  });

  it("does not animate radio dots from scale-0", () => {
    expect(source("radio-group.tsx")).not.toMatch(/after:scale-0/u);
    expect(source("radio-group.tsx")).toMatch(/after:scale-95/u);
  });

  it("origins menus from the trigger, not the center", () => {
    const overlay = designFile("ui/src/tokens/components/overlay.ts");

    for (const surface of ["menuSurface", "selectSurface", "popoverSurface", "tooltipSurface"]) {
      expect(overlay).toMatch(
        new RegExp(`${surface}:[\\s\\S]*?origin-\\[var\\(--transform-origin\\)\\]`, "u"),
      );
    }
    const modalBlock = overlay.match(/modalSurface:\s*\[[\s\S]*?\],/u)?.[0] ?? "";
    expect(modalBlock).toMatch(/modalSurface/u);
    expect(modalBlock).not.toMatch(/origin-\[var\(--transform-origin\)\]/u);
  });

  it("keeps stagger in the 30–80ms band", () => {
    const motion = designFile("ui/src/tokens/motion.ts");

    expect(motion).toMatch(/staggerChildren:\s*0\.04/u);
    expect(motion).toMatch(/staggerChildren:\s*0\.06/u);
    expect(motion).toMatch(/staggerChildren:\s*0\.08/u);
    expect(motion).not.toMatch(/staggerChildren:\s*0\.1(?:0|5)?\b/u);
  });

  it("skips tooltip delay and duration after the first open in a group", () => {
    const tooltip = source("tooltip.tsx");
    const overlay = designFile("ui/src/tokens/components/overlay.ts");

    expect(tooltip).toMatch(/SKIP_DELAY_WINDOW_MS/u);
    expect(tooltip).toMatch(/data-instant/u);
    expect(overlay).toMatch(/data-\[instant\]:duration-0/u);
  });

  it("defaults AnimateIn to fade, not cinematic emerge", () => {
    expect(source("animate-in.tsx")).toMatch(/preset = "fade"/u);
    expect(source("animate-in.tsx")).not.toMatch(/preset = "emerge"/u);
  });

  it("does not wrap NodeGraphCanvas in cinematic emerge", () => {
    const canvas = designFile("ui/src/components/node-graph-canvas.tsx");
    expect(canvas).not.toMatch(/preset=["']emerge["']/u);
    expect(canvas).not.toContain("AnimateIn");
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
