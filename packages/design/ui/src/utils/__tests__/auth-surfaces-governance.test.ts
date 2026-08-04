import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUTH_FORM_COLUMN_CLASS,
  AUTH_OAUTH_BUTTON_CLASS,
  AUTH_OAUTH_GRID_CLASS,
  AUTH_PRIMARY_CTA_CLASS,
} from "../auth-surfaces";

const REPO_ROOT = join(process.cwd(), "../../..");

const SPLIT_LAYOUTS = [
  "apps/auth/src/components/auth-split-layout.tsx",
  "apps/web/src/components/auth/auth-split-layout.tsx",
] as const;

const AUTH_SURFACES = [
  "apps/auth/src/components/credentials-form.tsx",
  "apps/auth/src/components/magic-link-form.tsx",
  "apps/auth/src/components/forgot-password-form.tsx",
  "apps/auth/src/components/reset-password-form.tsx",
  "apps/web/src/components/auth/sign-in-form.tsx",
  "apps/web/src/components/auth/passkey-panel.tsx",
  "apps/web/src/components/auth/clerk-enterprise-sso-handoff.tsx",
] as const;

const OAUTH_BUTTONS = [
  "apps/auth/src/components/oauth-buttons.tsx",
  "apps/web/src/components/auth/oauth-buttons.tsx",
] as const;

const FOREGROUND_FILL_FIGHT =
  /bg-\[hsl\(var\(--foreground\)\)\][\s\S]{0,120}text-\[hsl\(var\(--background\)\)\]/;

describe("auth surface layout contracts", () => {
  it("forces login-column width (min 360px cap), not soft max-w-sm/xs alone", () => {
    expect(AUTH_FORM_COLUMN_CLASS).toMatch(/360px|min\(100%/);
    expect(AUTH_FORM_COLUMN_CLASS).toContain("min-w-0");
    expect(AUTH_FORM_COLUMN_CLASS).not.toContain("max-w-sm");
    expect(AUTH_FORM_COLUMN_CLASS).not.toContain("max-w-xs");
    // Split shell must not reintroduce nested card chrome.
    expect(AUTH_FORM_COLUMN_CLASS).not.toContain("rounded-2xl");
    expect(AUTH_FORM_COLUMN_CLASS).not.toContain("shadow-sm");
    expect(AUTH_PRIMARY_CTA_CLASS).toContain("w-full");
  });

  it("both product AuthSplitLayouts apply width SSOT without card chrome", () => {
    for (const rel of SPLIT_LAYOUTS) {
      const source = readFileSync(join(REPO_ROOT, rel), "utf8");
      expect(source, rel).toContain("AUTH_FORM_COLUMN_CLASS");
      expect(source, rel).not.toContain("AUTH_FORM_CARD_CLASS");
      // Server-safe path only — @nebutra/ui/utils was once client-stamped and
      // RSC treated AUTH_FORM_* as client proxies (login card className empty).
      expect(source, rel).toContain('from "@nebutra/ui/utils/auth-surfaces"');
      // Forbid bare barrel import of AUTH_FORM_* (cn from @nebutra/ui/utils is fine).
      expect(source, rel).not.toMatch(
        /import\s*\{[^}]*AUTH_FORM_COLUMN_CLASS[^}]*\}\s*from\s*["']@nebutra\/ui\/utils["']/,
      );
      expect(source, rel).not.toMatch(/max-w-sm(?![\w-])/);
      expect(source, rel).not.toMatch(/max-w-xs(?![\w-])/);
      // Nested card chrome ban (border + rounded + shadow wrappers).
      expect(source, rel).not.toMatch(
        /rounded-2xl border border-border bg-background p-6 shadow-sm/,
      );
    }
  });

  it("utils barrel + auth-surfaces entry stay free of use client (RSC-safe)", () => {
    const tsup = readFileSync(join(REPO_ROOT, "packages/design/ui/tsup.config.ts"), "utf8");
    expect(tsup).toMatch(/SERVER_ONLY_ENTRIES[\s\S]*utils\/index/);
    expect(tsup).toMatch(/SERVER_ONLY_ENTRIES[\s\S]*utils\/auth-surfaces/);
    expect(tsup).toContain('"utils/auth-surfaces"');
    const pkg = readFileSync(join(REPO_ROOT, "packages/design/ui/package.json"), "utf8");
    expect(pkg).toContain("./utils/auth-surfaces");
  });

  it("auth primary CTAs do not fight btn-brand-default with foreground fills", () => {
    for (const rel of AUTH_SURFACES) {
      const source = readFileSync(join(REPO_ROOT, rel), "utf8");
      expect(source, rel).not.toMatch(FOREGROUND_FILL_FIGHT);
    }
  });

  it("OAuth is Neon-style always-2-col compact grid (never stacked full-width bars)", () => {
    expect(AUTH_OAUTH_GRID_CLASS).toContain("grid-cols-2");
    expect(AUTH_OAUTH_BUTTON_CLASS).toContain("h-9");
    for (const rel of OAUTH_BUTTONS) {
      const source = readFileSync(join(REPO_ROOT, rel), "utf8");
      expect(source, rel).toContain("AUTH_OAUTH_GRID_CLASS");
      expect(source, rel).toContain("AUTH_OAUTH_BUTTON_CLASS");
      // Forbidden: stack-when-two gate or always-single-col for 2 providers
      expect(source, rel).not.toMatch(/providers\.length\s*>=\s*3/);
      expect(source, rel).not.toMatch(/multiCol/);
      expect(source, rel).not.toMatch(/className="grid grid-cols-1 gap-3 sm:grid-cols-2"/);
      expect(source, rel).not.toMatch(/className="grid gap-3 grid-cols-1 sm:grid-cols-2"/);
      expect(source, rel).not.toMatch(/className="grid grid-cols-1 gap-3"/);
    }
  });
});
