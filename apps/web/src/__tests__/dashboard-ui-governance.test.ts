import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = process.cwd();
const REPO_ROOT = join(APP_ROOT, "../..");
const WORKSPACE_PAGE = join(APP_ROOT, "src/app/(app)/workspace/page.tsx");
const STARTUP_OS_PAGE = join(APP_ROOT, "src/app/(app)/startup-os/page.tsx");
const SHELL = join(APP_ROOT, "src/app/providers/design-system-shell.tsx");
const SKELETONS = join(APP_ROOT, "src/app/(app)/_dashboard-skeletons.tsx");
const APP_LOADING = join(APP_ROOT, "src/app/(app)/loading.tsx");
const GETTING_STARTED = join(APP_ROOT, "src/components/onboarding/getting-started.tsx");
const TEAM_INVITE_FORM = join(APP_ROOT, "src/app/(app)/settings/team/InviteMemberForm.tsx");
const SETTINGS_API_KEY_FORM = join(
  APP_ROOT,
  "src/app/(app)/settings/api-keys/CreateApiKeyForm.tsx",
);
const API_KEY_DIALOG = join(APP_ROOT, "src/components/api-keys/create-api-key-dialog.tsx");
const WEBHOOK_DIALOG = join(APP_ROOT, "src/components/webhooks/create-webhook-dialog.tsx");
const SHARED_EN_MESSAGES = join(REPO_ROOT, "packages/platform/i18n/locales/en.json");
const SHARED_ZH_MESSAGES = join(REPO_ROOT, "packages/platform/i18n/locales/zh.json");
const EXTERNAL_TASTE_PREFIX = ["cu", "lt-"].join("");

describe("@nebutra/web dashboard UI governance", () => {
  it("keeps the workspace route a thin post-login alias instead of a dashboard overview", () => {
    const source = readFileSync(WORKSPACE_PAGE, "utf8");

    // /workspace redirects via resolveAuthenticatedHomePath: Startup OS when
    // the prototype is on, Connectors in production when it is off.
    expect(source).toContain('from "next/navigation"');
    expect(source).toContain("resolveAuthenticatedHomePath");
    expect(source).not.toContain("DashboardCommandSurface");
    expect(source).not.toContain('data-dashboard-section="workspace-overview"');
    expect(source).not.toContain(EXTERNAL_TASTE_PREFIX);
  });

  it("does not 404 Startup OS when the production prototype flag is off", () => {
    const source = readFileSync(STARTUP_OS_PAGE, "utf8");

    expect(source).toContain("resolveAuthenticatedHomePath");
    expect(source).toContain("redirect(");
    expect(source).not.toContain("notFound(");
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

  it("centers the app-route loading fallback in the content pane", () => {
    const source = readFileSync(APP_LOADING, "utf8");

    expect(source).toContain("w-full");
    expect(source).toContain("items-center");
    expect(source).toContain("justify-center");
    expect(source).toContain("px-6");
    expect(source).not.toMatch(/Loading dashboard data/);
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

  it("keeps settings and secret-handling microcopy in restrained status voice", () => {
    const sources = [
      TEAM_INVITE_FORM,
      SETTINGS_API_KEY_FORM,
      API_KEY_DIALOG,
      WEBHOOK_DIALOG,
      SHARED_EN_MESSAGES,
      SHARED_ZH_MESSAGES,
    ].map((filePath) => readFileSync(filePath, "utf8"));

    for (const source of sources) {
      expect(source).not.toContain("Copied!");
      expect(source).not.toContain("已复制！");
      expect(source).not.toContain("Invitation sent!");
    }

    expect(readFileSync(SETTINGS_API_KEY_FORM, "utf8")).toContain("This key appears once.");
    expect(readFileSync(API_KEY_DIALOG, "utf8")).toContain("This key appears once.");
    expect(readFileSync(WEBHOOK_DIALOG, "utf8")).toContain(
      "Endpoint created. The signing secret appears once.",
    );
  });

  it("does not animate dashboard page shells or product lists", () => {
    const roots = [
      join(APP_ROOT, "src/app/(app)"),
      join(APP_ROOT, "src/components/startup-os"),
      join(APP_ROOT, "src/components/atelier"),
      join(APP_ROOT, "src/components/reel"),
      join(APP_ROOT, "src/components/cofounder-match"),
      join(APP_ROOT, "src/components/settings/organization"),
      join(APP_ROOT, "src/vite-app/routes"),
    ];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const next = join(dir, entry);
        if (statSync(next).isDirectory()) walk(next);
        else if (/\.(tsx|ts)$/u.test(entry) && !entry.includes(".test.")) files.push(next);
      }
    };
    for (const root of roots) walk(root);

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/preset="(?:emerge|fadeUp|fade|scale)"/u);
      expect(source, file).not.toMatch(/<AnimateIn[\s>]/u);
      expect(source, file).not.toMatch(/<AnimateInGroup[\s>]/u);
    }
  });
});
