import fs from "node:fs";
import path from "node:path";
import type { NebutraConfig } from "./config";

// applyGovernanceLints — wires the generalized, config-driven governance lints
// (shipped into the output under scripts/governance/ via cloneTemplate) into the
// scaffolded project's `pnpm lint` pipeline, feature-gated per lint.
//
// Two concerns, both feature-aware:
//   1. Write governance.config.json with scaffold-layout defaults — only the
//      sections for the lints that are actually enabled. Some lints ship with
//      shrink-only allowlists that mirror the current scaffold baseline.
//   2. Patch the cloned root package.json "lint" script to chain
//      `node scripts/governance/lint-*.mjs` for each enabled lint, preserving
//      the existing head of the chain (e.g. `biome check .`).
//
// Gating:
//   • no-raw-inputs   — gateFeature "always". The scaffold always ships the UI
//                       layer + apps/, so the rule always applies.
//   • repository-seam — gateFeature "database". A core-domain data-layer ratchet;
//                       meaningless when database=none.
//
// Design-system-specific lints (dark-overrides, spacing-opacity,
// arbitrary-breakpoints, phosphor-zone) are intentionally NOT shipped — they
// encode internal token-authoring invariants, not rules a downstream SaaS needs.

const RAW_INPUTS_CMD = "node scripts/governance/lint-no-raw-inputs.mjs";
const REPOSITORY_SEAM_CMD = "node scripts/governance/lint-repository-seam.mjs";
const BRAND_LITERALS_CMD = "node scripts/governance/lint-brand-literals.mjs";
const MICROCOPY_CMD = "node scripts/governance/lint-microcopy.mjs";

// All command fragments this util manages. Any inherited reference to one of
// these (or to the monorepo's own path-hardcoded scripts/lint-*.mjs, which are
// design-system-specific and not shipped to scaffolds) is rebuilt from scratch
// so the output's lint chain contains exactly the enabled, generalized lints.
// Regex also matches lint-microcopy so inherited monorepo references are pruned.
const MONOREPO_LINT_CMD_RE = /\bnode\s+scripts\/(governance\/)?lint-[\w-]+\.mjs/g;

// The monorepo's per-lint helper scripts reference scripts/lint-*.mjs at the
// repo root (NOT under governance/). Those .mjs files are removed from the
// scaffold by .templateignore, so any cloned package.json script that points at
// them is dangling and must be pruned — otherwise the scaffold ships broken
// `lint:no-dark-drift`, `lint:phosphor-zone`, … scripts.
const MONOREPO_ROOT_LINT_CMD_RE = /\bnode\s+scripts\/lint-[\w-]+\.mjs/;

// Scaffold-layout defaults for governance.config.json. These mirror the
// built-in DEFAULTS in scripts/governance/_config.mjs so the emitted file is an
// explicit, editable starting point — but contain NO monorepo-absolute paths.
const RAW_INPUTS_DEFAULTS = {
  scanRoots: ["apps"],
  primitivesImport: "@nebutra/ui/primitives",
  // The scaffold ships docs-shell preview/demo components (e.g. the Fumadocs
  // skeleton under apps/design-docs/src/components/previews/, kept by
  // .templateignore) that intentionally render raw native form controls to
  // demonstrate browser behavior. Storybook stories do the same. These are
  // documentation demos, not product UI, so they are exempt — exactly as the
  // monorepo's own lint-no-raw-inputs.mjs whitelists them.
  whitelist: [
    "/storybook/src/stories/",
    "/design-docs/src/components/previews/",
    "/sailor-docs/src/components/previews/",
    "\\.test\\.tsx?$",
    "/__tests__/",
  ],
};

const REPOSITORY_SEAM_DEFAULTS = {
  coreDomains: [
    "^packages/.*/(billing|license|metering|auth|audit|permissions|identity|tenant)/",
    "^backends/gateway/src/routes/(billing|ai|admin|legal|integrations|webhooks)/",
    "^apps/web/src/app/api/",
  ],
  seamPaths: ["^packages/platform/repositories/", "^packages/platform/db/"],
  dbAccessors: ["getTenantDb", "getSystemDb"],
  // SHRINK-ONLY ratchet baseline. The scaffold ships working core-domain code
  // (billing/license/audit/admin/webhook routes, team-invitation flows) that
  // currently accesses the DB client directly via the configured dbAccessors
  // rather than through a platform repository. These pre-existing bypasses are
  // the scaffold's starting baseline — the ratchet's job is to prevent NEW ones
  // and to flag any of these once they migrate. Mirrors the monorepo's own
  // KNOWN_SEAM_BYPASS, filtered to the files that actually ship (internal-only
  // files like the inngest functions and side packages are stripped by
  // .templateignore, so they are intentionally absent here).
  allowlist: [
    "apps/web/src/app/api/invitations/[invitationId]/accept/route.ts",
    "apps/web/src/app/api/onboarding/invite-members/route.ts",
    "apps/web/src/app/api/startup-os/projects/[projectId]/runs/[runId]/execute/route.ts",
    "apps/web/src/app/api/cofounder/room/[profileId]/form-team/route.ts",
    "apps/web/src/app/api/provider-keys/route.ts",
    "backends/gateway/src/routes/admin/index.ts",
    "backends/gateway/src/routes/ai/api-keys.ts",
    "backends/gateway/src/routes/ai/usage.ts",
    "backends/gateway/src/routes/billing/index.ts",
    "backends/gateway/src/routes/integrations/index.ts",
    "backends/gateway/src/routes/legal/consent.ts",
    "backends/gateway/src/routes/webhooks/clerk.ts",
    "backends/gateway/src/routes/webhooks/stripe.ts",
    "packages/commerce/license/src/issue-license.ts",
    "packages/commerce/license/src/validate-license.ts",
    "packages/commerce/billing/src/credits/service.ts",
    "packages/commerce/billing/src/usage/ledger.ts",
    "packages/iam/audit/src/index.ts",
    "packages/iam/auth/src/plugins/passkey-plugin.ts",
  ] as string[],
};

// Microcopy ratchet defaults. Always-on — scaffolded projects enforce the
// seven-prohibition rule from day one. The bannedPatterns array is intentionally
// EMPTY: a fresh scaffold has no Nebutra-specific Chinese copy rules baked in.
// Project operators add their own patterns to governance.config.json. The
// allowlist is also empty — no pre-existing microcopy debt on a clean scaffold.
const MICROCOPY_DEFAULTS = {
  scanRoots: ["apps/web/src"],
  excludePaths: [
    "/api/",
    "\\.test\\.tsx?$",
    "/__tests__/",
    "/storybook/src/stories/",
    "/design-docs/",
    "/sailor-docs/",
  ],
  // Project-specific banned copy patterns go here (array of { pattern, label }).
  // See scripts/governance/lint-microcopy.mjs for the mechanically-lintable
  // subset (禁七/禁四/禁一 partial + emoji/exclamation). Human-review patterns
  // (禁二/禁三/禁五/禁六 + §6.5 IP red lines) must NOT be added as mechanical rules.
  bannedPatterns: [] as { pattern: string; label: string }[],
  // SHRINK-ONLY ratchet. Fresh scaffolds start with ZERO microcopy debt.
  allowlist: [] as string[],
};

// Brand-literal ratchet defaults. Always-on — scaffolded projects enforce
// single-source brand identity from day one. The allowlist mirrors the current
// shipped scaffold baseline and is shrink-only: existing raw literals migrate
// on-touch, while new files fail immediately. Operators who add brand identity
// to their apps must import from the brand package rather than hardcoding
// strings.
const BRAND_LITERALS_DEFAULTS = {
  governedPaths: ["apps", "packages/commerce", "packages/integrations/email"],
  allowExpressions: [
    "Nebutra",
    "云毓智能",
    "云毓",
    "nebutra\\.com",
    "nebutra\\.ai",
    "#0033FE",
    "#0BF1C3",
  ],
  knownExemptPatterns: [
    "\\.stories\\.tsx?$",
    "/__tests__/",
    "\\.test\\.tsx?$",
    "/previews/",
    "^packages/design/brand/",
    "^packages/design/tokens/",
    "^packages/design/design-tokens/",
  ],
  allowlist: [] as string[],
};

// Candidate shrink-only baseline for the current scaffold mirror. The final
// generated allowlist is filtered against the actual scaffold output so cleaned
// or option-pruned files are not written as stale debt.
const BRAND_LITERALS_BASELINE_ALLOWLIST = [
  "apps/design-docs/mdx-components.tsx",
  "apps/design-docs/next.config.ts",
  "apps/design-docs/src/__registry__/index.tsx",
  "apps/design-docs/src/app/[lang]/docs/[[...slug]]/page.tsx",
  "apps/design-docs/src/app/[lang]/docs/layout.tsx",
  "apps/design-docs/src/app/[lang]/layout.tsx",
  "apps/design-docs/src/app/[lang]/registry/[name]/page.tsx",
  "apps/design-docs/src/app/[lang]/registry/page.tsx",
  "apps/design-docs/src/app/og/docs/[...slug]/route.tsx",
  "apps/design-docs/src/components/brand-overview-visuals.tsx",
  "apps/design-docs/src/components/color-usage.tsx",
  "apps/design-docs/src/components/component-preview.tsx",
  "apps/design-docs/src/components/gradient-demos.tsx",
  "apps/design-docs/src/components/introduction-hero.tsx",
  "apps/design-docs/src/components/motion-demos.tsx",
  "apps/design-docs/src/components/pattern-demos.tsx",
  "apps/design-docs/src/components/registry/registry-card.tsx",
  "apps/design-docs/src/lib/github.ts",
  "apps/design-docs/src/lib/registry-strings.ts",
  "apps/design-docs/src/lib/registry.ts",
  "apps/idp/src/app/layout.tsx",
  "apps/idp/src/app/oauth/authorize/page.tsx",
  "apps/idp/src/app/page.tsx",
  "apps/idp/src/lib/oidc.ts",
  "apps/landing-page/src/app/[lang]/layout.tsx",
  "apps/landing-page/src/app/api/blog/comments/route.ts",
  "apps/landing-page/src/app/api/blog/reactions/route.ts",
  "apps/landing-page/src/app/api/og/route.ts",
  "apps/landing-page/src/app/apple-icon.tsx",
  "apps/landing-page/src/components/auth/google-one-tap.tsx",
  "apps/landing-page/src/components/cookie-consent-banner.tsx",
  "apps/landing-page/src/components/marketing/ProductHuntSection.tsx",
  "apps/landing-page/src/components/marketing/TestimonialsSection.tsx",
  "apps/landing-page/src/i18n/request.ts",
  "apps/landing-page/src/lib/analytics/emit.ts",
  "apps/landing-page/src/lib/blog-fallback.ts",
  "apps/landing-page/src/lib/constants/playbook-data.ts",
  "apps/landing-page/src/lib/constants/resources-data.ts",
  "apps/landing-page/src/lib/constants/solutions-data.ts",
  "apps/landing-page/src/lib/docs-links.ts",
  "apps/landing-page/src/lib/env.ts",
  "apps/landing-page/src/lib/landing-content.ts",
  "apps/landing-page/src/lib/seo/metadata.ts",
  "apps/landing-page/src/lib/seo/site-routes.ts",
  "apps/landing-page/src/lib/status-checks.ts",
  "apps/landing-page/src/proxy.ts",
  "apps/mail-preview/scripts/export.ts",
  "apps/mail-preview/scripts/render-react-templates.ts",
  "apps/mail-preview/src/app/api/send-test/route.ts",
  "apps/mail-preview/src/app/layout.tsx",
  "apps/mail-preview/src/lib/fixtures.ts",
  "apps/web/next.config.ts",
  "apps/web/src/app/(app)/checkout-return/page.tsx",
  "apps/web/src/app/(app)/choose-plan/page.tsx",
  "apps/web/src/app/(app)/settings/api-keys/page.tsx",
  "apps/web/src/app/(app)/settings/notifications/page.tsx",
  "apps/web/src/app/(app)/settings/provider-keys/page.tsx",
  "apps/web/src/app/(auth)/desktop-auth/complete/page.tsx",
  "apps/web/src/app/(public)/page.tsx",
  "apps/web/src/app/[locale]/welcome/page.tsx",
  "apps/web/src/app/api/account/email-change/route.ts",
  "apps/web/src/app/api/admin/access-invites/route.ts",
  "apps/web/src/app/api/blog/comments/route.ts",
  "apps/web/src/app/api/blog/reactions/route.ts",
  "apps/web/src/app/api/me/public/route.ts",
  "apps/web/src/app/api/organizations/[orgId]/members/route.ts",
  "apps/web/src/app/global-error.tsx",
  "apps/web/src/components/ErrorBoundary.tsx",
  "apps/web/src/components/api-keys/create-api-key-dialog.tsx",
  "apps/web/src/components/appearance/store.ts",
  "apps/web/src/components/auth/auth-banner.tsx",
  "apps/web/src/components/auth/desktop-auth-complete-handoff.tsx",
  "apps/web/src/components/auth/sign-up-form.tsx",
  "apps/web/src/components/billing/billing-self-service.tsx",
  "apps/web/src/components/navigation/public-page-chrome.tsx",
  "apps/web/src/components/notifications/inbox-bell.tsx",
  "apps/web/src/components/notifications/notification-inbox-preview.tsx",
  "apps/web/src/components/notifications/notification-preference-matrix.tsx",
  "apps/web/src/components/notifications/notification-runtime-banner.tsx",
  "apps/web/src/components/settings/security/security-capabilities.ts",
  "apps/web/src/components/settings/security/security-settings-client.tsx",
  "apps/web/src/components/theme-playground/design-md-import.tsx",
  "apps/web/src/components/theme-playground/theme-playground-workbench.tsx",
  "apps/web/src/components/theme-playground/theme-token-data.ts",
  "apps/web/src/lib/api.ts",
  "apps/web/src/lib/api/client.ts",
  "apps/web/src/lib/env.ts",
  "apps/web/src/lib/integrations/catalog.tsx",
  "apps/web/src/lib/permissions.ts",
  "apps/web/src/lib/public-url-defaults.ts",
  "apps/web/src/lib/session-hint.ts",
  "apps/web/src/lib/startup-os/company-context/generate.ts",
  "apps/web/src/lib/startup-os/company-context/projection.ts",
  "apps/web/src/lib/startup-os/conversation.ts",
  "apps/web/src/lib/startup-os/execution.ts",
  "apps/web/src/lib/startup-os/files.ts",
  "apps/web/src/proxy.ts",
  "packages/commerce/billing/src/index.ts",
  "packages/commerce/contracts/src/identity.ts",
  "packages/commerce/legal/src/components/CookieBanner.tsx",
  "packages/commerce/legal/src/documents/config.ts",
  "packages/commerce/legal/src/index.ts",
  "packages/commerce/marketing/src/components/ProductHuntBadge.tsx",
  "packages/commerce/marketing/src/config/index.ts",
  "packages/commerce/marketing/src/index.ts",
  "packages/integrations/email/src/index.ts",
  "packages/integrations/email/src/templates/_layout.ts",
  "packages/integrations/email/src/templates/invitation.tsx",
] as const;

export interface GovernanceLintsResult {
  /** Lint command fragments appended to the package.json "lint" script. */
  lints: string[];
  /** Whether governance.config.json was written. */
  configWritten: boolean;
}

/**
 * Rebuild a package.json "lint" script's chain.
 *
 * Strips any inherited `node scripts/(governance/)?lint-*.mjs` references — the
 * cloned template carries the monorepo's own path-hardcoded, design-system-
 * specific lint commands, which do not belong in a scaffold — then re-appends
 * exactly the enabled generalized governance commands. The non-lint head of the
 * chain (e.g. `biome check .`) is preserved.
 */
function rebuildLintScript(existing: string | undefined, lints: string[]): string {
  const stripped = (existing ?? "")
    .replace(MONOREPO_LINT_CMD_RE, "")
    // collapse the now-dangling ` && ` joiners left by the removals.
    .split("&&")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(" && ");

  const head = stripped.length > 0 ? stripped : "biome check .";
  return [head, ...lints].join(" && ");
}

function filterBrandLiteralBaseline(targetDir: string): string[] {
  const pattern = new RegExp(BRAND_LITERALS_DEFAULTS.allowExpressions.join("|"));
  return BRAND_LITERALS_BASELINE_ALLOWLIST.filter((relPath) => {
    try {
      return pattern.test(fs.readFileSync(path.join(targetDir, relPath), "utf8"));
    } catch {
      return false;
    }
  });
}

export async function applyGovernanceLints(
  targetDir: string,
  config: NebutraConfig,
): Promise<GovernanceLintsResult> {
  // -- 1. decide which lints are enabled (feature-gated) --
  const databaseEnabled = config.database !== "none";

  const lints: string[] = [RAW_INPUTS_CMD]; // always
  if (databaseEnabled) lints.push(REPOSITORY_SEAM_CMD);
  lints.push(BRAND_LITERALS_CMD); // always — enforce single-source brand identity
  lints.push(MICROCOPY_CMD); // always — enforce seven-prohibition microcopy rule

  // -- 2. write governance.config.json with only enabled sections --
  const brandLiterals = {
    ...BRAND_LITERALS_DEFAULTS,
    allowlist: filterBrandLiteralBaseline(targetDir),
  };
  const governanceConfig: Record<string, unknown> = {
    rawInputs: RAW_INPUTS_DEFAULTS,
    brandLiterals,
    microcopyRules: MICROCOPY_DEFAULTS,
  };
  if (databaseEnabled) {
    governanceConfig.repositorySeam = REPOSITORY_SEAM_DEFAULTS;
  }

  const configPath = path.join(targetDir, "governance.config.json");
  fs.writeFileSync(configPath, JSON.stringify(governanceConfig, null, 2) + "\n");

  // -- 3. patch the cloned root package.json "lint" script --
  const pkgPath = path.join(targetDir, "package.json");
  // Read-then-act (no existsSync check) avoids a check-then-use file race.
  let pkgRaw: string | undefined;
  try {
    pkgRaw = fs.readFileSync(pkgPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (pkgRaw !== undefined) {
    const pkg = JSON.parse(pkgRaw);
    pkg.scripts = pkg.scripts ?? {};

    // Drop dangling per-lint helper scripts inherited from the monorepo
    // (lint:no-dark-drift, lint:phosphor-zone, …). They invoke the repo-root
    // scripts/lint-*.mjs files, which .templateignore removes from the scaffold,
    // so they would error on run. The main `lint` key is rebuilt below.
    for (const [key, value] of Object.entries(pkg.scripts)) {
      if (key === "lint") continue;
      if (typeof value === "string" && MONOREPO_ROOT_LINT_CMD_RE.test(value)) {
        delete pkg.scripts[key];
      }
    }

    pkg.scripts.lint = rebuildLintScript(pkg.scripts.lint, lints);
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  return { lints, configWritten: true };
}
