import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUTH_FORM_CARD_CLASS,
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
  it("forces login-card width (min 360px cap), not soft max-w-sm/xs alone", () => {
    expect(AUTH_FORM_COLUMN_CLASS).toMatch(/360px|min\(100%/);
    expect(AUTH_FORM_COLUMN_CLASS).toContain("min-w-0");
    expect(AUTH_FORM_COLUMN_CLASS).not.toContain("max-w-sm");
    expect(AUTH_FORM_COLUMN_CLASS).not.toContain("max-w-xs");
    expect(AUTH_FORM_CARD_CLASS).toContain("rounded");
    expect(AUTH_PRIMARY_CTA_CLASS).toContain("w-full");
  });

  it("both product AuthSplitLayouts apply column + card SSOT", () => {
    for (const rel of SPLIT_LAYOUTS) {
      const source = readFileSync(join(REPO_ROOT, rel), "utf8");
      expect(source, rel).toContain("AUTH_FORM_COLUMN_CLASS");
      expect(source, rel).toContain("AUTH_FORM_CARD_CLASS");
      expect(source, rel).toContain('from "@nebutra/ui/utils"');
      expect(source, rel).not.toMatch(/max-w-sm(?![\w-])/);
      expect(source, rel).not.toMatch(/max-w-xs(?![\w-])/);
    }
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
