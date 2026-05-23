import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formControlFocusClassNames, formControlInvalidClassNames } from "../form-control";

const formPrimitiveSources = ["input.tsx", "textarea.tsx", "select.tsx"] as const;

const sourceFor = (filename: (typeof formPrimitiveSources)[number]) =>
  readFileSync(join(process.cwd(), "src", "primitives", filename), "utf8");

const commandStylesSource = () =>
  readFileSync(join(process.cwd(), "src", "primitives", "command-styles.ts"), "utf8");

const globalFocusSources = [
  join(process.cwd(), "..", "design-tokens", "static", "base.css"),
  join(process.cwd(), "..", "tokens", "styles.css"),
] as const;

describe("form primitive focus governance", () => {
  it.each([
    "input",
    "textarea",
    "select",
  ] as const)("centralizes %s focus styling on focus-visible", (slot) => {
    expect(formControlFocusClassNames[slot]).toMatch(/\bfocus-visible:border-ring\b/u);
    expect(formControlFocusClassNames[slot]).toMatch(/\bfocus-visible:ring-/u);
    expect(formControlFocusClassNames[slot]).not.toMatch(/\bfocus:border-ring\b/u);
    expect(formControlFocusClassNames[slot]).not.toMatch(/\bfocus:ring-/u);
    expect(formControlInvalidClassNames[slot]).toMatch(
      /\baria-invalid:focus-visible:border-destructive\b/u,
    );
    expect(formControlInvalidClassNames[slot]).not.toMatch(
      /\baria-invalid:focus:border-destructive\b/u,
    );
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
    expect(source).toMatch(/\bfocus:outline-none\b/u);
    expect(source).toMatch(/\bfocus-visible:outline-none\b/u);
    expect(source).toContain("[&::-webkit-search-cancel-button]:appearance-none");
    expect(source).not.toMatch(/\bfocus:ring-/u);
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
