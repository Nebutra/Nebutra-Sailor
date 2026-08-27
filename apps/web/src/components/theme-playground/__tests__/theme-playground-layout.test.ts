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

  it("sizes charts from the selected artboard, not the browser breakpoint", () => {
    const source = readFileSync(WORKBENCH, "utf8");
    const css = readFileSync(PLAYGROUND_CSS, "utf8");

    expect(source).toContain("theme-preview-artboard");
    expect(source).toContain("theme-charts-grid");
    expect(source).not.toContain("lg:grid-cols-3");
    expect(css).toMatch(/\.theme-preview-artboard\s*\{[^}]*container:\s*theme-preview/);
    expect(css).toContain(".theme-charts-grid");
    expect(css).not.toMatch(/\.theme-preview-canvas\s*\{[^}]*container:\s*theme-preview/);
  });

  it("gives the live preview pane a bounded scrollport instead of a 680px floor", () => {
    const source = readFileSync(WORKBENCH, "utf8");

    expect(source).toContain("theme-preview-canvas");
    expect(source).toContain("min-h-0 flex-1 overflow-auto");
    expect(source).not.toContain("min-h-[680px]");
    expect(source).not.toContain("min-h-[640px]");
    expect(source).not.toContain("h-[calc(100dvh-3rem)]");
  });

  it("keeps the canvas beside the stacked registry on mid-width playgrounds", () => {
    const css = readFileSync(PLAYGROUND_CSS, "utf8");

    expect(css).toContain('"registry canvas"');
    expect(css).toContain('"inspector canvas"');
    expect(css).not.toContain("grid-column: 1 / -1");
  });
});
