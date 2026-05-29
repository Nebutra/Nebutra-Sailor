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
    expect(source).toContain("bg-sidebar-primary text-sidebar-primary-foreground");
    expect(source).toContain("hover:bg-sidebar-accent");
    expect(source).toContain("border-sidebar-border");
    expect(source).not.toMatch(/dark:(bg|border|text)-(black|white)(?:\b|\/|\[)/);
  });
});
