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
  it("redirects the converged workspace route to the Startup OS entry surface", () => {
    const source = readFileSync(WORKSPACE_PAGE, "utf8");

    // Home converged into Startup OS (merge): /workspace is a locale-aware
    // server redirect to /startup-os, not a duplicate dashboard overview.
    expect(source).toContain('from "next/navigation"');
    expect(source).toContain("redirect(`/${locale}/startup-os`)");
    expect(source).toContain("await params");
    expect(source).not.toContain("DashboardCommandSurface");
    expect(source).not.toContain('data-dashboard-section="workspace-overview"');
    expect(source).not.toContain(EXTERNAL_TASTE_PREFIX);
  });

  it("keeps the app shell visually governed instead of page-local chrome hacks", () => {
    const shellSource = readFileSync(SHELL, "utf8");

    expect(shellSource).toContain("dashboard-app-content");
    // Brand-header wrapper stays high-density (px-2, items-center) and centers
    // the mark when collapsed. The collapse-toggle refactor (fb42789f) split the
    // wrapper into a conditional justify, so assert the governed parts rather
    // than the old single concatenated string.
    expect(shellSource).toContain("flex items-center px-2");
    expect(shellSource).toContain('collapsed ? "justify-center"');
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
