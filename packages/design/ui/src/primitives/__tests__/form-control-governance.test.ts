import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { overlayClassNames } from "../../tokens/components/overlay";
import { formControlFocusClassNames, formControlInvalidClassNames } from "../form-control";

const formPrimitiveSources = ["input.tsx", "textarea.tsx", "select.tsx"] as const;
const focusVisibleOnlySources = [
  "alert.tsx",
  "assisted-password-confirmation.tsx",
  "command-styles.ts",
  "dialog.tsx",
  "dropdown-menu.tsx",
  "filter-pills.tsx",
  "grid-system.tsx",
  "menubar.tsx",
  "multi-select.tsx",
  "multiple-selector.tsx",
  "navigation-menu.tsx",
  "radio-group-card.tsx",
  "radio-group-stacked.tsx",
  "reaction-chip.tsx",
  "select.tsx",
  "sheet.tsx",
  "toggle-group.tsx",
] as const;
const overlayPrimitiveSources = ["navigation-menu.tsx", "menu.tsx", "sheet.tsx"] as const;
const overlayFamilyPrimitiveSources = [
  "command.tsx",
  "dialog.tsx",
  "popover.tsx",
  "dropdown-menu.tsx",
  "menubar.tsx",
  "context-menu.tsx",
  "hover-card-content.tsx",
] as const;

const sourceFor = (filename: (typeof formPrimitiveSources)[number]) =>
  readFileSync(join(process.cwd(), "src", "primitives", filename), "utf8");

const commandStylesSource = () =>
  readFileSync(join(process.cwd(), "src", "primitives", "command-styles.ts"), "utf8");

const primitiveSourceFor = (filename: string) =>
  readFileSync(join(process.cwd(), "src", "primitives", filename), "utf8");

const globalFocusSources = [
  join(process.cwd(), "..", "design-tokens", "static", "base.css"),
  join(process.cwd(), "..", "tokens", "styles.css"),
] as const;

describe("form primitive focus governance", () => {
  it.each([
    "input",
    "textarea",
    "select",
  ] as const)("centralizes %s text-control focus styling on focus", (slot) => {
    expect(formControlFocusClassNames[slot]).toMatch(/\boutline-none\b/u);
    expect(formControlFocusClassNames[slot]).toMatch(/\bfocus:border-ring\b/u);
    expect(formControlFocusClassNames[slot]).toContain(
      `focus:ring-[length:var(--${slot}-focus-ring-width)]`,
    );
    expect(formControlFocusClassNames[slot]).toMatch(/\bfocus:ring-ring\/30\b/u);
    expect(formControlFocusClassNames[slot]).not.toMatch(/\bfocus-visible:/u);
    expect(formControlInvalidClassNames[slot]).toMatch(/\baria-invalid:border-destructive\/60\b/u);
    expect(formControlInvalidClassNames[slot]).toMatch(
      /\baria-invalid:focus:border-destructive\b/u,
    );
    expect(formControlInvalidClassNames[slot]).toMatch(
      /\baria-invalid:focus:ring-destructive\/20\b/u,
    );
    expect(formControlInvalidClassNames[slot]).not.toMatch(/\bfocus-visible:/u);
  });

  it.each(formPrimitiveSources)("does not inline raw focus ring classes in %s", (filename) => {
    const source = sourceFor(filename);

    expect(source).not.toMatch(/\bfocus:border-ring\b/u);
    expect(source).not.toMatch(/\bfocus:ring-/u);
    expect(source).not.toMatch(/\baria-invalid:focus:border-destructive\b/u);
    expect(source).not.toMatch(/\baria-invalid:focus:ring-destructive\b/u);
    expect(source).toMatch(/formControlFocusClassNames/u);
    expect(source).toMatch(/formControlInvalidClassNames/u);
  });

  it("removes browser-native chrome from cmdk command inputs", () => {
    const source = commandStylesSource();

    expect(source).toMatch(/\bappearance-none\b/u);
    expect(source).toMatch(/\bborder-0\b/u);
    expect(source).toMatch(/\bshadow-none\b/u);
    expect(source).toMatch(/\boutline-none\b/u);
    expect(source).toMatch(/\bfocus-visible:outline-none\b/u);
    expect(source).toContain("[&::-webkit-search-cancel-button]:appearance-none");
    expect(source).not.toMatch(/\bfocus:ring-/u);
    expect(source).not.toMatch(/\bfocus-within:border-ring\b/u);
  });

  it.each(
    focusVisibleOnlySources,
  )("does not regress %s to mouse-triggered focus visuals", (filename) => {
    const source = primitiveSourceFor(filename);

    expect(source).not.toMatch(/\bfocus:border-ring\b/u);
    expect(source).not.toMatch(/\bfocus:ring-/u);
    expect(source).not.toMatch(/\bfocus:bg-/u);
    expect(source).not.toMatch(/\bfocus:text-/u);
    expect(source).not.toMatch(/\bfocus:shadow-/u);
    expect(source).not.toMatch(/\bfocus:z-/u);
    expect(source).not.toMatch(/\bfocus:scale-/u);
    expect(source).not.toMatch(/\bfocus-within:border-ring\b/u);
    expect(source).not.toMatch(/\bfocus-within:ring-/u);
    expect(source).not.toMatch(/\bfocus-within:bg-/u);
  });

  it.each(
    globalFocusSources,
  )("does not apply global focus-visible outlines to text-like controls in %s", (file) => {
    const source = readFileSync(file, "utf8");

    expect(source).toContain(":focus-visible:not(");
    expect(source).toContain(
      ':where(input, textarea, select, [cmdk-input], [role="textbox"], [contenteditable="true"])',
    );
  });
});

describe("overlay primitive focus governance", () => {
  it("suppresses browser-native modal outlines at the token layer", () => {
    expect(overlayClassNames.modalSurface).toMatch(/\boutline-none\b/u);
    expect(overlayClassNames.closeButton).toMatch(/\boutline-none\b/u);
    expect(overlayClassNames.closeButton).not.toMatch(/\bfocus-visible:outline-none\b/u);
  });

  it("centralizes overlay surface and motion class contracts", () => {
    const classNames = overlayClassNames as Record<string, string>;

    expect(classNames.menuSurface).toContain("duration-[var(--motion-duration-flow)]");
    expect(classNames.selectSurface).toContain("duration-[var(--select-duration)]");
    expect(classNames.selectSurface).toContain("shadow-[var(--select-content-shadow)]");
    expect(classNames.navigationMenuSurface).toContain("duration-[var(--motion-duration-flow)]");
    expect(classNames.sheetBackdrop).toContain("duration-[var(--motion-duration-flow)]");
    expect(classNames.sheetSurface).toContain("duration-[var(--motion-duration-flow)]");
    expect(classNames.sheetSurface).toMatch(/\boutline-none\b/u);
    expect(classNames.focusRing).toMatch(/\boutline-none\b/u);
    expect(classNames.focusRing).not.toMatch(/\bfocus-visible:outline-none\b/u);
  });

  it.each(
    overlayPrimitiveSources,
  )("does not suppress native outlines only at focus-visible in %s", (filename) => {
    const source = primitiveSourceFor(filename);

    expect(source).not.toMatch(/\bfocus-visible:outline-none\b/u);
  });

  it("routes navigation menu content through the shared menu surface token", () => {
    const source = primitiveSourceFor("navigation-menu.tsx");

    expect(source).toMatch(/overlayClassNames\.navigationMenuSurface/u);
    expect(source).toMatch(/overlayZIndex\.popover/u);
    expect(source).not.toMatch(/\banimate-in\b/u);
    expect(source).not.toMatch(/\bduration-200\b/u);
    expect(source).not.toMatch(/\bbg-background\/90\b/u);
    expect(source).not.toMatch(/\bshadow-xl\b/u);
  });

  it("routes sheet backdrop and surface depth through shared overlay tokens", () => {
    const source = primitiveSourceFor("sheet.tsx");

    expect(source).toMatch(/overlayClassNames\.sheetBackdrop/u);
    expect(source).toMatch(/overlayClassNames\.sheetSurface/u);
    expect(source).toMatch(/overlayClassNames\.focusRing/u);
    expect(source).toMatch(/overlayZIndex\.backdrop/u);
    expect(source).toMatch(/overlayZIndex\.modal/u);
    expect(source).not.toMatch(/\bz-50\b/u);
  });

  it("routes select content through the shared overlay token contract", () => {
    const source = primitiveSourceFor("select.tsx");

    expect(source).toMatch(/overlayClassNames\.selectSurface/u);
    expect(source).toMatch(/overlayZIndex\.popover/u);
    expect(source).not.toMatch(/\bz-50\b/u);
    expect(source).not.toMatch(/\banimate-in\b/u);
    expect(source).not.toMatch(/\banimate-out\b/u);
    expect(source).not.toMatch(/\bbg-background\/90\b/u);
  });

  it.each([
    "alert-dialog.tsx",
    "confirm-dialog.tsx",
    "hover-card-content.tsx",
  ] as const)("routes %s through shared overlay tokens", (filename) => {
    const source = primitiveSourceFor(filename);

    expect(source).toMatch(/overlayClassNames/u);
    expect(source).not.toMatch(/\bbg-black\/80\b/u);
    expect(source).not.toMatch(/\bfocus-visible:ring-green-/u);
    expect(source).not.toMatch(/\bborder-green-/u);
  });

  it("keeps menubar root out of the tab order so the surface cannot show native focus chrome", () => {
    const source = primitiveSourceFor("menubar.tsx");

    expect(source).toMatch(/tabIndex=\{-1\}\s+role="menubar"/u);
    expect(source).toMatch(/role="menuitem"\s+tabIndex=\{0\}/u);
    expect(source).toMatch(/overlayClassNames\.menuSurface/u);
  });

  it.each(
    overlayFamilyPrimitiveSources,
  )("routes %s through canonical primitive overlay class contracts", (filename) => {
    const source = primitiveSourceFor(filename);

    expect(source).toMatch(/overlay(?:Primitive)?ClassNames/u);
    expect(source).not.toMatch(/\bz-50\b/u);
    expect(source).not.toMatch(/\bshadow-(?:lg|xl|2xl)\b/u);
    expect(source).not.toMatch(/\bfocus-visible:ring-/u);
    expect(source).not.toMatch(/\brounded-\[var\(--radius-(?:md|lg|xl)\)\]/u);
    expect(source).not.toMatch(/\bborder-border(?:\b|\/)/u);
  });
});
