import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { controlFocusVisibleClassName } from "../form-control";

/**
 * 2026 visual contract for the form-control base layer.
 *
 * Static borders stay hairline tokens, selection is a fill or ring (never a
 * black fill), focus comes from one recipe in form-control.ts, and every
 * interactive control names the properties it transitions.
 */
const source = (filename: string) =>
  readFileSync(join(process.cwd(), "src", "primitives", filename), "utf8");

const controlSources = [
  "button-variants.ts",
  "button.tsx",
  "input.tsx",
  "textarea.tsx",
  "select.tsx",
  "combobox.tsx",
  "checkbox-group.tsx",
  "radio-group.tsx",
  "radio-group-card.tsx",
  "radio-group-stacked.tsx",
  "switch.tsx",
  "toggle.tsx",
  "toggle-group.tsx",
  "toggle-group-variants.ts",
  "slider.tsx",
  "slider-number-flow.tsx",
  "field.tsx",
  "label.tsx",
] as const;

const interactiveSources = [
  "button-variants.ts",
  "input.tsx",
  "textarea.tsx",
  "select.tsx",
  "combobox.tsx",
  "checkbox-group.tsx",
  "radio-group.tsx",
  "radio-group-card.tsx",
  "radio-group-stacked.tsx",
  "switch.tsx",
  "toggle.tsx",
  "toggle-group-variants.ts",
  "slider.tsx",
] as const;

const focusRecipeSources = [
  "button-variants.ts",
  "radio-group-card.tsx",
  "radio-group-stacked.tsx",
  "toggle-group.tsx",
  "slider-number-flow.tsx",
] as const;

describe("form-control visual contract", () => {
  it.each(controlSources)("%s: no heavy static borders or transition-all", (filename) => {
    const code = source(filename);

    expect(code).not.toMatch(/\btransition-all\b/u);
    expect(code).not.toMatch(/\bborder-(?:foreground|black|ink)\b/u);
    expect(code).not.toMatch(/\bborder-2\b/u);
    expect(code).not.toMatch(/\bborder-\[(?:2|3)px\]/u);
  });

  it.each(controlSources)("%s: transitions name their properties", (filename) => {
    expect(source(filename)).not.toMatch(
      /(?<![\w-])transition-(?:colors|transform|opacity|shadow)\b/u,
    );
  });

  it.each(interactiveSources)("%s: declares a property-listed transition", (filename) => {
    expect(source(filename)).toMatch(/transition-\[[a-z,-]+\]/u);
  });

  it.each(controlSources)("%s: type sizes are semantic, not arbitrary px", (filename) => {
    expect(source(filename)).not.toMatch(/\btext-\[\d+(?:\.\d+)?px\]/u);
  });

  it.each(controlSources)("%s: no solid-black selected fill", (filename) => {
    expect(source(filename)).not.toMatch(
      /\b(?:data-\[[a-z-]+(?:=[a-z]+)?\]|peer-checked|aria-pressed|aria-selected):bg-(?:foreground|neutral-12|black)\b/u,
    );
  });

  it("exposes one keyboard-focus recipe: 2px outline, 2px offset, ring colour", () => {
    expect(controlFocusVisibleClassName).toMatch(/\bfocus-visible:outline-2\b/u);
    expect(controlFocusVisibleClassName).toMatch(/\bfocus-visible:outline-offset-2\b/u);
    expect(controlFocusVisibleClassName).toMatch(
      /\bfocus-visible:outline-\[hsl\(var\(--ring\)\)\]/u,
    );
    expect(controlFocusVisibleClassName).not.toMatch(/outline-none/u);
    expect(controlFocusVisibleClassName).not.toMatch(/(?<!-)\bfocus:/u);
  });

  it.each(focusRecipeSources)("%s: takes keyboard focus from the shared recipe", (filename) => {
    expect(source(filename)).toMatch(/controlFocusVisibleClassName/u);
  });

  it("combobox: draws the same border + ring as Select, from the shared contract", () => {
    const combobox = source("combobox.tsx");
    expect(combobox).toMatch(/formControlFocusClassNames\.select/u);
    expect(combobox).toMatch(/--select-focus-ring-width/u);
  });

  it.each(
    controlSources,
  )("%s: never strips the keyboard outline without a replacement", (filename) => {
    expect(source(filename)).not.toMatch(/\bfocus-visible:outline-none\b/u);
  });

  it("button: micro rail, ease-out, press scale, reduced-motion safe", () => {
    const variants = source("button-variants.ts");

    expect(variants).toMatch(/\bduration-micro\b/u);
    expect(variants).toMatch(/\bease-out\b/u);
    expect(variants).not.toMatch(/\bduration-flow\b/u);
    expect(variants).toMatch(/active:scale-\[0\.97\]/u);
    expect(variants).toMatch(/motion-reduce:transform-none/u);
  });

  it("combobox trigger animates its focus ring, not just colour", () => {
    expect(source("combobox.tsx")).toMatch(
      /transition-\[background-color,border-color,box-shadow,color\]/u,
    );
  });

  it.each([
    "button.tsx",
    "input.tsx",
  ] as const)("%s: rotating spinner degrades to an opacity pulse under reduced motion", (filename) => {
    expect(source(filename)).toMatch(/motion-reduce:animate-pulse/u);
  });

  it("combobox list takes the popover surface's Base UI enter/exit and the Base UI anchor width", () => {
    const combobox = source("combobox.tsx");
    const surface = readFileSync(
      join(process.cwd(), "src", "tokens", "components", "overlay.ts"),
      "utf8",
    );
    const popoverSurface = surface.match(/popoverSurface:\s*\[[\s\S]*?\]\.join/u)?.[0] ?? "";

    // The enter/exit lives on the shared surface, keyed on Base UI's styling
    // attributes, from >=0.96 within 200ms, origin at Base UI's --transform-origin.
    expect(popoverSurface).toMatch(/data-\[starting-style\]:scale-\[0\.9[6-9]\]/u);
    expect(popoverSurface).toMatch(/data-ending-style:scale-\[0\.9[6-9]\]/u);
    expect(popoverSurface).toMatch(/origin-\[var\(--transform-origin\)\]/u);
    expect(popoverSurface).toMatch(/duration-\[var\(--motion-duration-flow\)\]/u);
    // Combobox must not fork it, and must size to Base UI's trigger width var.
    expect(combobox).not.toMatch(/data-\[(?:open|closed)\]:(?:scale|opacity)/u);
    expect(combobox).not.toMatch(/radix-popover-trigger-width/u);
    expect(combobox).toMatch(/var\(--anchor-width\)/u);
  });

  it("recipe: brand default button hover is gated behind a hover-capable pointer", () => {
    const recipe = readFileSync(join(process.cwd(), "..", "tokens", "recipe.css"), "utf8");
    const gated = recipe.match(/@media\s*\(hover:\s*hover\)\s*\{\s*\.btn-brand-default:hover/u);

    expect(gated).not.toBeNull();
    expect(
      recipe.replace(/@media\s*\(hover:\s*hover\)\s*\{\s*\.btn-brand-default:hover/u, ""),
    ).not.toMatch(/\.btn-brand-default:hover/u);
  });
});
