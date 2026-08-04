import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AUTH_FORM_COLUMN_CLASS, AUTH_PRIMARY_CTA_CLASS } from "../auth-surfaces";

/**
 * Auth form-column + primary CTA contracts.
 *
 * Hard-and-correct: one width, one CTA recipe. Both product shells
 * (auth-center + Agent OS web) must import the SSOT; ad-hoc max-widths
 * and bg-[hsl(var(--foreground))] fights against btn-brand-default are
 * banned so the column cannot silently widen or re-paint identity blue.
 *
 * Paths are monorepo-relative from packages/design/ui (vitest cwd).
 */
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
  it("exports a login-card column (max-w-xs / 20rem), not looser form scales", () => {
    expect(AUTH_FORM_COLUMN_CLASS).toContain("max-w-xs");
    expect(AUTH_FORM_COLUMN_CLASS).not.toContain("max-w-sm");
    expect(AUTH_FORM_COLUMN_CLASS).not.toMatch(/max-w-\[\d+px\]/);
    expect(AUTH_PRIMARY_CTA_CLASS).toContain("w-full");
  });

  it("both product AuthSplitLayouts import and apply AUTH_FORM_COLUMN_CLASS", () => {
    for (const rel of SPLIT_LAYOUTS) {
      const source = readFileSync(join(REPO_ROOT, rel), "utf8");
      expect(source, rel).toContain("AUTH_FORM_COLUMN_CLASS");
      expect(source, rel).toContain('from "@nebutra/ui/utils"');
      expect(source, rel).not.toMatch(/max-w-\[\d+px\]/);
      expect(source, rel).not.toMatch(/max-w-sm(?![\w-])/);
    }
  });

  it("auth primary CTAs do not fight btn-brand-default with foreground fills", () => {
    for (const rel of AUTH_SURFACES) {
      const source = readFileSync(join(REPO_ROOT, rel), "utf8");
      expect(source, rel).not.toMatch(FOREGROUND_FILL_FIGHT);
    }
  });

  it("OAuth grids stay single-column for two providers (no stretched dual pills)", () => {
    for (const rel of OAUTH_BUTTONS) {
      const source = readFileSync(join(REPO_ROOT, rel), "utf8");
      expect(source, rel).toMatch(/providers\.length\s*>=\s*3/);
      expect(source, rel).not.toMatch(/className="grid grid-cols-1 gap-3 sm:grid-cols-2"/);
      expect(source, rel).not.toMatch(/className="grid gap-3 grid-cols-1 sm:grid-cols-2"/);
    }
  });
});
