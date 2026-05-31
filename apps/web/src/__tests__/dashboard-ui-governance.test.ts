import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = process.cwd();
const WORKSPACE_PAGE = join(APP_ROOT, "src/app/[locale]/(app)/workspace/page.tsx");
const SHELL = join(APP_ROOT, "src/app/[locale]/providers/design-system-shell.tsx");
const SKELETONS = join(APP_ROOT, "src/app/[locale]/(app)/_dashboard-skeletons.tsx");
const GETTING_STARTED = join(APP_ROOT, "src/components/onboarding/getting-started.tsx");
const EXTERNAL_TASTE_PREFIX = ["cu", "lt-"].join("");

describe("@nebutra/web dashboard UI governance", () => {
  it("consumes dashboard primitives from @nebutra/ui on the overview page", () => {
    const source = readFileSync(WORKSPACE_PAGE, "utf8");

    expect(source).toContain("DashboardCommandSurface");
    expect(source).toContain("DashboardMetricTile");
    expect(source).toContain("DashboardPanel");
    expect(source).toContain("RecentSessions");
    expect(source).not.toContain("GettingStarted");
    expect(source).toContain('from "@nebutra/ui/patterns"');
    expect(source).toContain('data-dashboard-section="workspace-overview"');
    expect(source).not.toContain(EXTERNAL_TASTE_PREFIX);
  });

  it("keeps the app shell visually governed instead of page-local chrome hacks", () => {
    const shellSource = readFileSync(SHELL, "utf8");

    expect(shellSource).toContain("dashboard-app-content");
    expect(shellSource).toContain("items-center justify-center px-2");
    expect(shellSource).toContain("border-0 bg-transparent shadow-none");
    expect(shellSource).not.toContain('collapsed ? "justify-center" : "justify-start');
    expect(shellSource).not.toContain(EXTERNAL_TASTE_PREFIX);
  });

  it("keeps dashboard dark mode on semantic surfaces instead of raw black/white overlays", () => {
    const dashboardChromeSources = [SHELL].map((filePath) => readFileSync(filePath, "utf8"));

    for (const source of dashboardChromeSources) {
      expect(source).not.toMatch(/dark:(bg|border|text)-(black|white)(?:\b|\/|\[)/);
      expect(source).not.toMatch(/\bbg-(black|white)(?:\b|\/|\[)/);
    }
  });

  it("aligns dashboard loading skeletons with the upgraded surfaces", () => {
    const source = readFileSync(SKELETONS, "utf8");

    expect(source).toContain("dashboard-skeleton-surface");
    expect(source).toContain("bg-neutral-2/70");
    expect(source).not.toContain(EXTERNAL_TASTE_PREFIX);
  });

  it("keeps the onboarding checklist visually aligned with dashboard panels", () => {
    const source = readFileSync(GETTING_STARTED, "utf8");

    expect(source).toContain("DashboardPanel");
    expect(source).toContain('from "@nebutra/ui/patterns"');
    expect(source).not.toContain("rounded-[var(--radius-2xl)]");
    expect(source).not.toContain(EXTERNAL_TASTE_PREFIX);
  });
});
