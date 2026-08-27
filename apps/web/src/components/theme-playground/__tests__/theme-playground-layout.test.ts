import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const WORKBENCH = join(__dirname, "../theme-playground-workbench.tsx");
const PLAYGROUND_CSS = join(process.cwd(), "src/app/globals.css");

describe("Theme Playground layout contract", () => {
  it("shows one preview suite at a time instead of stacking every demo", () => {
    const source = readFileSync(WORKBENCH, "utf8");

    expect(source).toContain('activeSuite === "forms"');
    expect(source).toContain('activeSuite === "pricing"');
    expect(source).not.toContain("<FormsPanel active=");
    expect(source).not.toContain("<PricingPanel active=");
    expect(source).not.toContain("Focused");
  });

  it("keeps pricing cards as a column so features never collide with the CTA", () => {
    const source = readFileSync(WORKBENCH, "utf8");

    expect(source).toContain("theme-pricing-grid");
    expect(source).toContain("flex h-full min-w-0 flex-col");
    expect(source).toContain("mt-auto");
    expect(source).not.toContain("-top-3 -translate-x-1/2 absolute left-1/2");
  });

  it("keeps registry rows to name, description, and swatches", () => {
    const source = readFileSync(WORKBENCH, "utf8");

    expect(source).not.toContain(">{theme.kind}<");
    expect(source).not.toContain("theme.proves[0]");
    expect(source).not.toContain("border-white/10");
  });

  it("lets the pricing grid go three columns before the canvas is ultrawide", () => {
    const css = readFileSync(PLAYGROUND_CSS, "utf8");

    expect(css).toContain("@container theme-preview (min-width: 40rem)");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
  });
});
