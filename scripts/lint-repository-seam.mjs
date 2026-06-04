#!/usr/bin/env node

// CI guard: the Repository Seam (incremental convergence toward swappable ORM).
//
// Goal — keep the door open to a future Prisma -> Drizzle swap (or any ORM)
// WITHOUT a big-bang rewrite. The rule: direct Prisma query access
// (`db.<model>.findMany()`, `$transaction`, `$queryRaw`, …) belongs ONLY inside
// the data-access seam. Everything else (routes, services, jobs, UI) must go
// through a repository from `@nebutra/repositories`.
//
// The seam (allowed to touch the Prisma client directly):
//   • packages/platform/repositories/**   — the repositories themselves
//   • packages/platform/db/**             — the client/pool/RLS wrapper + scripts
//
// This is a SHRINK-ONLY ratchet, exactly like the OpenAPI content-drift guard:
//   • KNOWN_SEAM_BYPASS lists the files that currently bypass the seam.
//   • A NEW file that bypasses the seam (not on the list) => FAIL. New code must
//     use a repository (create one in @nebutra/repositories if missing).
//   • An allowlisted file that no longer bypasses (got migrated) but is still
//     listed => FAIL. Remove it from the list. The list may only shrink.
//
// Migration policy: existing bypasses are migrated ON-TOUCH — when you next edit
// one of these files, route its data access through a repository and delete its
// entry here. Do not mass-migrate.
//
// Escape hatch: a file with a top-level `// @seam-exempt: <reason>` comment is
// skipped (for legitimate raw-SQL/migration/store cases). Use sparingly.
//
// Run: node scripts/lint-repository-seam.mjs

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PRISMA_OPS = [
  "findMany",
  "findFirst",
  "findUnique",
  "findUniqueOrThrow",
  "findFirstOrThrow",
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "aggregate",
  "groupBy",
  "count",
  "\\$transaction",
  "\\$queryRaw",
  "\\$executeRaw",
];
const OP_RE = new RegExp(`\\.(${PRISMA_OPS.join("|")})\\(`);

// Seam dirs (allowed to touch Prisma directly) + non-shipped files.
const EXEMPT = [
  /^packages\/platform\/repositories\//,
  /^packages\/platform\/db\//,
  /\.test\.tsx?$/,
  /\/__tests__\//,
  /\/generated\//,
];
const isExempt = (p) => EXEMPT.some((re) => re.test(p));

// Files that currently bypass the seam. SHRINK-ONLY — remove on migration.
const KNOWN_SEAM_BYPASS = new Set([
  "apps/landing-page/src/app/api/license/route.ts",
  "apps/sleptons/src/lib/members.ts",
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
  "packages/ai/atelier-canvas/src/store/prisma.ts",
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

// Candidate files: use a Prisma client accessor. Passing the client into a
// repository (`new UserRepository(getTenantDb(t))`) is fine; calling a Prisma
// op on it is the bypass. We approximate that by requiring BOTH the accessor
// and an op call in the same file.
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
  .filter((p) => !isExempt(p));

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
    "\n❌ Repository-seam violation — these files access Prisma directly but are NOT in the seam.\n" +
      "   Route their data access through a repository from @nebutra/repositories\n" +
      "   (add one if the entity has none), or add `// @seam-exempt: <reason>`:\n" +
      newViolations.map((f) => `   - ${f}`).join("\n") +
      "\n",
  );
}

if (fixedButListed.length > 0) {
  failed = true;
  process.stderr.write(
    "\n❌ These files no longer bypass the seam (migrated 🎉) — remove them from\n" +
      "   KNOWN_SEAM_BYPASS in scripts/lint-repository-seam.mjs (the list is shrink-only):\n" +
      fixedButListed.map((f) => `   - ${f}`).join("\n") +
      "\n",
  );
}

if (failed) process.exit(1);

process.stdout.write(
  `✓ repository-seam: ${detected.size} known bypass(es), 0 new. ` +
    "Direct Prisma access stays inside the seam.\n",
);
