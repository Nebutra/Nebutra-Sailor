import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PATTERNS_BARREL = join(process.cwd(), "src/patterns/index.ts");
const DASHBOARD_SURFACES = join(process.cwd(), "src/patterns/dashboard-surfaces.tsx");
const APP_SHELL = join(process.cwd(), "src/layout/app-shell.tsx");
const SIDEBAR_NAV = join(process.cwd(), "src/patterns/sidebar-nav/sidebar-nav.tsx");
const EXTERNAL_TASTE_PREFIX = ["cu", "lt-"].join("");

describe("@nebutra/ui dashboard surface governance", () => {
  it("exports reusable dashboard primitives through the patterns barrel", () => {
    const barrelSource = readFileSync(PATTERNS_BARREL, "utf8");

    expect(barrelSource).toContain("DashboardCommandSurface");
    expect(barrelSource).toContain("DashboardMetricTile");
    expect(barrelSource).toContain("DashboardPanel");
    expect(barrelSource).toContain("./dashboard-surfaces");
  });

  it("keeps dashboard texture and density as Nebutra-owned primitives", () => {
    const source = readFileSync(DASHBOARD_SURFACES, "utf8");

    expect(source).toContain('data-pattern="nebutra-dashboard-command"');
    expect(source).toContain('data-pattern="nebutra-dashboard-panel"');
    expect(source).toContain('data-pattern="nebutra-dashboard-metric"');
    expect(source).toContain("bg-card");
    expect(source).toContain("text-card-foreground");
    expect(source).toContain("border-border");
    expect(source).toContain("tabular-nums");
    expect(source).not.toMatch(/dark:(bg|border|text)-(black|white)(?:\b|\/|\[)/);
    expect(source).not.toContain(EXTERNAL_TASTE_PREFIX);
  });

  it("gives AppShell a product-owned background and chrome hook", () => {
    const source = readFileSync(APP_SHELL, "utf8");

    expect(source).toContain('data-ui="nebutra-app-shell"');
    expect(source).toContain("bg-background");
    expect(source).toContain("bg-sidebar");
    expect(source).toContain("border-sidebar-border");
    expect(source).not.toMatch(/dark:(bg|border|text)-(black|white)(?:\b|\/|\[)/);
  });

  it("keeps sidebar navigation states dense and product-owned", () => {
    const source = readFileSync(SIDEBAR_NAV, "utf8");

    expect(source).toContain('data-ui="nebutra-sidebar-nav"');
    expect(source).toContain("border-sidebar-border");

    // Current page = a soft surface, a hairline edge and an accent-tinted icon.
    // The 2026 shells (Linear, Raycast) all mark position with surface and use
    // the accent surgically; a saturated fill made the active row the loudest
    // thing on screen. This replaces the older `bg-sidebar-primary` fill
    // contract deliberately — see the component comment for the reasoning.
    expect(source).toContain("bg-sidebar-accent text-sidebar-foreground font-medium");
    expect(source).toContain("shadow-[inset_0_0_0_1px_var(--sidebar-border)]");
    expect(source).toContain('item.isActive && "text-sidebar-primary"');
    // Hover stays a step below the selected surface.
    expect(source).toContain("hover:bg-sidebar-accent/55");
    // The accent never returns as a fill on a nav row.
    expect(source).not.toContain("bg-sidebar-primary text-sidebar-primary-foreground");

    expect(source).not.toMatch(/dark:(bg|border|text)-(black|white)(?:\b|\/|\[)/);
  });
});
