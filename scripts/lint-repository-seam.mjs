#!/usr/bin/env node

// CI guard: the Repository Seam — applied SELECTIVELY, not dogmatically.
//
// Repository seam is a best practice for CORE, long-evolving business modules —
// NOT for every table. Wrapping a trivial CRUD table in a repository that just
// forwards to Prisma is over-abstraction (Prisma already gives type-safe
// queries). So this guard only enforces the seam in CORE_SEAM_DOMAINS: the
// modules whose data access is most likely to grow caching / multi-tenancy /
// RLS / async workers / external stores (S3/OSS, vector/search) over time.
//
// Decision test for a piece of data access:
//   "Could this ever change implementation, or add caching / permissions /
//    multi-tenancy / audit / async tasks?"  yes -> seam.  no (simple read) -> direct Prisma is fine.
//
// CORE (seam required): users/teams/permissions, subscriptions/quota/payments,
//   agent runs/exec/logs, file/PDF/markdown tasks, license/audit/tenancy/identity.
// NOT governed (direct Prisma OK): simple CMS content, config tables, one-off
//   scripts, marketing surfaces, side apps.
//
// The seam (may touch the Prisma client directly):
//   packages/platform/repositories/** and packages/platform/db/**.
//
// SHRINK-ONLY ratchet (like the OpenAPI content-drift guard):
//   • A NEW core-domain file that bypasses the seam => FAIL (use / create a
//     repository in @nebutra/repositories).
//   • A listed file that no longer bypasses (migrated) => FAIL — remove it.
//   • Existing core bypasses migrate ON-TOUCH; the list may only shrink.
// Escape hatch: top-level `// @seam-exempt: <reason>` (raw SQL / migration / store).
//
// Run: node scripts/lint-repository-seam.mjs

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PRISMA_OPS = [
  "findMany", "findFirst", "findUnique", "findUniqueOrThrow", "findFirstOrThrow",
  "create", "createMany", "createManyAndReturn", "update", "updateMany", "upsert",
  "delete", "deleteMany", "aggregate", "groupBy", "count",
  "\\$transaction", "\\$queryRaw", "\\$executeRaw",
];
const OP_RE = new RegExp(`\\.(${PRISMA_OPS.join("|")})\\(`);

// CORE business domains where the seam is REQUIRED. Everything outside these is
// intentionally NOT governed — keep simple CRUD simple.
const CORE_SEAM_DOMAINS = [
  // subscriptions / quota / payments / license / metering
  /^packages\/commerce\/(billing|license|metering)\//,
  // users / teams / permissions / audit / tenancy / identity
  /^packages\/iam\/(auth|audit|permissions|identity|tenant)\//,
  // agent runs / execution / logs
  /^packages\/ai\/agent-runtime\//,
  // file / object-store / async task surfaces
  /^packages\/integrations\/(uploads|storage)\//,
  /^packages\/integrations\/queue\/src\/scheduled\//,
  // gateway core domains: billing, ai/agent, admin, legal/consent, integrations, webhooks, async fns
  /^backends\/gateway\/src\/inngest\//,
  /^backends\/gateway\/src\/routes\/(billing|ai|admin|legal|integrations|webhooks)\//,
  // web: teams/invitations, onboarding, startup-os (agent runs)
  /^apps\/web\/src\/app\/api\/(invitations|onboarding|startup-os)\//,
  /^apps\/web\/src\/app\/\[locale\]\/\(app\)\/organization-invitation\//,
  /^apps\/web\/src\/lib\/invitations\.ts$/,
];
const isCore = (p) => CORE_SEAM_DOMAINS.some((re) => re.test(p));

// The seam + non-shipped files are never violations.
const EXEMPT = [
  /^packages\/platform\/repositories\//,
  /^packages\/platform\/db\//,
  /\.test\.tsx?$/,
  /\/__tests__\//,
  /\/generated\//,
];
const isExempt = (p) => EXEMPT.some((re) => re.test(p));

// Core-domain files that currently bypass the seam. SHRINK-ONLY.
const KNOWN_SEAM_BYPASS = new Set([
  "apps/web/src/app/[locale]/(app)/organization-invitation/[invitationId]/page.tsx",
  "apps/web/src/app/api/invitations/[invitationId]/accept/route.ts",
  "apps/web/src/app/api/onboarding/invite-members/route.ts",
  "apps/web/src/app/api/startup-os/projects/[projectId]/runs/[runId]/execute/route.ts",
  "apps/web/src/lib/invitations.ts",
  "backends/gateway/src/inngest/functions/gdprDeletion.ts",
  "backends/gateway/src/inngest/functions/tenantProvisioning.ts",
  "backends/gateway/src/inngest/functions/userSync.ts",
  "backends/gateway/src/routes/admin/index.ts",
  "backends/gateway/src/routes/ai/api-keys.ts",
  "backends/gateway/src/routes/ai/usage.ts",
  "backends/gateway/src/routes/billing/index.ts",
  "backends/gateway/src/routes/integrations/index.ts",
  "backends/gateway/src/routes/legal/consent.ts",
  "backends/gateway/src/routes/webhooks/clerk.ts",
  "backends/gateway/src/routes/webhooks/stripe.ts",
  "packages/ai/agent-runtime/src/adapters/prisma-rollout.ts",
  "packages/commerce/billing/src/credits/service.ts",
  "packages/commerce/billing/src/usage/ledger.ts",
  "packages/commerce/license/src/handlers/on-license-issued.ts",
  "packages/commerce/license/src/issue-license.ts",
  "packages/commerce/license/src/validate-license.ts",
  "packages/iam/audit/src/index.ts",
  "packages/iam/auth/src/plugins/passkey-plugin.ts",
  "packages/integrations/queue/src/scheduled/jobs/invitation-cleanup.ts",
  "packages/integrations/queue/src/scheduled/jobs/session-cleanup.ts",
]);

let raw = "";
try {
  raw = execSync(
    "grep -rlE 'getTenantDb|getSystemDb' --include='*.ts' --include='*.tsx' apps backends packages 2>/dev/null " +
      "| grep -v node_modules | grep -v '/dist/' | grep -v '/generated/' | grep -v '/.next/'",
    { encoding: "utf-8" },
  ).trim();
} catch {
  raw = "";
}

const candidates = raw
  .split("\n")
  .map((p) => p.replace(/^\.\//, ""))
  .filter(Boolean)
  .filter((p) => isCore(p) && !isExempt(p));

const detected = new Set();
for (const file of candidates) {
  const src = readFileSync(file, "utf-8");
  if (/\/\/\s*@seam-exempt/.test(src)) continue;
  if (OP_RE.test(src)) detected.add(file);
}

const newViolations = [...detected].filter((f) => !KNOWN_SEAM_BYPASS.has(f)).sort();
const fixedButListed = [...KNOWN_SEAM_BYPASS].filter((f) => !detected.has(f)).sort();

let failed = false;

if (newViolations.length > 0) {
  failed = true;
  process.stderr.write(
    "\n❌ Repository-seam violation in a CORE business domain — these files access\n" +
      "   Prisma directly. Route their data access through a repository from\n" +
      "   @nebutra/repositories (create one if the entity has none), or add\n" +
      "   `// @seam-exempt: <reason>`:\n" +
      newViolations.map((f) => `   - ${f}`).join("\n") +
      "\n",
  );
}

if (fixedButListed.length > 0) {
  failed = true;
  process.stderr.write(
    "\n❌ These core files no longer bypass the seam (migrated 🎉) — remove them from\n" +
      "   KNOWN_SEAM_BYPASS in scripts/lint-repository-seam.mjs (the list is shrink-only):\n" +
      fixedButListed.map((f) => `   - ${f}`).join("\n") +
      "\n",
  );
}

if (failed) process.exit(1);

process.stdout.write(
  `✓ repository-seam: ${detected.size} known core-domain bypass(es), 0 new. ` +
    "Simple CRUD outside core domains is intentionally ungoverned.\n",
);
