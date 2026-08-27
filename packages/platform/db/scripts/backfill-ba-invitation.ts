/**
 * ADR-12 Phase 3a — Backfill legacy `public.OrganizationInvitation` rows into
 * the canonical `auth.invitation` (`BAInvitation`) table.
 *
 * Field mapping (legacy → BA):
 *   email           → email
 *   organizationId  → organizationId
 *   role            → role          (legacy default "member" preserved)
 *   status          → status
 *   inviterId       → inviterId
 *   token           → token         (preserved verbatim — legacy accept URLs keep working)
 *   expiresAt       → expiresAt
 *   acceptedAt      → acceptedAt
 *   declinedAt      → declinedAt
 *   createdAt       → createdAt
 *
 * Dedupe key
 * ──────────
 * `(email, organizationId)` is NOT unique on either table. When the legacy
 * source contains multiple rows for the same `(email, organizationId)`, the
 * newest row by `createdAt` wins. Older duplicates are skipped (counted as
 * `skippedDuplicates`). The dedupe step happens in JS, BEFORE any insert, so
 * one-pass execution stays deterministic.
 *
 * Idempotency
 * ───────────
 * Re-running is safe: for each legacy row we first check whether a BA row with
 * the same `(email, organizationId)` already exists. If so we skip
 * (counted as `alreadyPresent`). No upserts, no overwrites.
 *
 * Flags
 * ─────
 *   --dry-run     Read-only. Logs counts as if writes had happened.
 *   --limit N     Process at most N legacy rows. Useful for staged backfills
 *                 (e.g. 1000 first, verify, then full run).
 *
 * Usage (manual, ops only — NOT in any pnpm lifecycle hook or CI):
 *   pnpm --filter @nebutra/db exec tsx scripts/backfill-ba-invitation.ts --dry-run
 *   pnpm --filter @nebutra/db exec tsx scripts/backfill-ba-invitation.ts --limit 1000
 *   pnpm --filter @nebutra/db exec tsx scripts/backfill-ba-invitation.ts
 *
 * ADR: docs/architecture/2026-05-12-invitation-table-consolidation.md
 */

import { logger } from "@nebutra/logger";
import { getSystemDb, type PrismaClient } from "../src/client";

/**
 * Subset of the Prisma client surface the backfill needs. Declaring it
 * structurally lets tests inject a lightweight in-memory fake without spinning
 * up a real Postgres connection (pglite + Prisma is non-trivial to wire up;
 * the migration tests already use raw SQL for that reason).
 */
export interface BackfillDb {
  organizationInvitation: {
    findMany(args?: {
      orderBy?: { createdAt: "asc" | "desc" };
      take?: number;
    }): Promise<LegacyInvitationRow[]>;
  };
  bAInvitation: {
    findFirst(args: {
      where: { email: string; organizationId: string };
    }): Promise<BAInvitationRow | null>;
    create(args: { data: BAInvitationCreateInput }): Promise<BAInvitationRow>;
  };
}

export interface LegacyInvitationRow {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  status: string;
  inviterId: string;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  createdAt: Date;
}

interface BAInvitationRow {
  id: string;
  email: string;
  organizationId: string;
}

interface BAInvitationCreateInput {
  email: string;
  organizationId: string;
  role: string | null;
  status: string;
  inviterId: string;
  token: string | null;
  expiresAt: Date | null;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  createdAt: Date;
}

export interface BackfillOptions {
  dryRun?: boolean;
  limit?: number;
  db?: BackfillDb;
}

export interface BackfillResult {
  totalLegacy: number;
  alreadyPresent: number;
  migrated: number;
  skippedDuplicates: number;
  dryRun: boolean;
}

/**
 * Dedupe legacy rows by `(email, organizationId)`. Newest `createdAt` wins.
 * Returns the deduped winners + the count of dropped duplicates.
 */
export function dedupeLegacyRows(rows: LegacyInvitationRow[]): {
  winners: LegacyInvitationRow[];
  droppedDuplicates: number;
} {
  const winners = new Map<string, LegacyInvitationRow>();
  let droppedDuplicates = 0;

  for (const row of rows) {
    const key = `${row.email.toLowerCase()}::${row.organizationId}`;
    const existing = winners.get(key);
    if (!existing) {
      winners.set(key, row);
      continue;
    }
    droppedDuplicates += 1;
    if (row.createdAt.getTime() > existing.createdAt.getTime()) {
      winners.set(key, row);
    }
  }

  return { winners: Array.from(winners.values()), droppedDuplicates };
}

/**
 * Run the backfill. Idempotent and reversible (writes only happen when a key
 * is genuinely missing in `auth.invitation`).
 */
export async function backfillBaInvitations(
  options: BackfillOptions = {},
): Promise<BackfillResult> {
  const dryRun = options.dryRun ?? false;
  const limit = options.limit;
  const db = options.db ?? (getSystemDb() as unknown as BackfillDb);

  const findArgs: { orderBy: { createdAt: "asc" | "desc" }; take?: number } = {
    orderBy: { createdAt: "asc" },
  };
  if (typeof limit === "number" && limit > 0) {
    findArgs.take = limit;
  }

  const legacyRows = await db.organizationInvitation.findMany(findArgs);
  const totalLegacy = legacyRows.length;

  logger.info("[backfill-ba-invitation] starting", {
    dryRun,
    limit: limit ?? null,
    totalLegacy,
  });

  const { winners, droppedDuplicates } = dedupeLegacyRows(legacyRows);

  let alreadyPresent = 0;
  let migrated = 0;

  for (const row of winners) {
    const existing = await db.bAInvitation.findFirst({
      where: { email: row.email, organizationId: row.organizationId },
    });

    if (existing) {
      alreadyPresent += 1;
      continue;
    }

    if (!dryRun) {
      await db.bAInvitation.create({
        data: {
          email: row.email,
          organizationId: row.organizationId,
          // Legacy default "member" is preserved; BA's role column accepts null
          // but normalizing to the explicit string keeps audit trails readable.
          role: row.role,
          status: row.status,
          inviterId: row.inviterId,
          token: row.token,
          expiresAt: row.expiresAt,
          acceptedAt: row.acceptedAt,
          declinedAt: row.declinedAt,
          createdAt: row.createdAt,
        },
      });
    }
    migrated += 1;
  }

  const result: BackfillResult = {
    totalLegacy,
    alreadyPresent,
    migrated,
    skippedDuplicates: droppedDuplicates,
    dryRun,
  };

  logger.info("[backfill-ba-invitation] done", { ...result });

  return result;
}

function parseArgs(argv: string[]): BackfillOptions {
  const opts: BackfillOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      opts.dryRun = true;
      continue;
    }
    if (arg === "--limit") {
      const next = argv[i + 1];
      const parsed = Number.parseInt(next ?? "", 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("--limit requires a positive integer (e.g. --limit 1000)");
      }
      opts.limit = parsed;
      i += 1;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const parsed = Number.parseInt(arg.slice("--limit=".length), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("--limit requires a positive integer (e.g. --limit=1000)");
      }
      opts.limit = parsed;
    }
  }
  return opts;
}

// CLI entrypoint — only runs when executed directly via `tsx`, not when
// imported by tests.
async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const result = await backfillBaInvitations(opts);
  process.stdout.write(
    `${JSON.stringify(
      {
        ...result,
        nextStep:
          result.migrated > 0 && result.dryRun ? "Re-run without --dry-run to apply" : "n/a",
      },
      null,
      2,
    )}\n`,
  );
  // Disconnect the lazy Prisma singleton so the process exits cleanly.
  const client = getSystemDb() as unknown as PrismaClient & { $disconnect?: () => Promise<void> };
  if (typeof client.$disconnect === "function") {
    await client.$disconnect();
  }
}

const isDirectInvocation = (() => {
  if (!process.argv[1]) return false;
  try {
    const invokedUrl = new URL(`file://${process.argv[1]}`).href;
    return invokedUrl === import.meta.url;
  } catch {
    return false;
  }
})();

if (isDirectInvocation) {
  main().catch((err) => {
    process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
    process.exit(1);
  });
}
