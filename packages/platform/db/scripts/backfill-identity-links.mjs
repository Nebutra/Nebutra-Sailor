#!/usr/bin/env node
// Backfill `user_identity_links` for people who have two ids.
//
// The auth center (Better Auth) mints `auth_users.id`; the platform's tables are
// keyed by `users.id`. People who predate the auth center own a Clerk-era
// `users` row under a different id (staff grants, tenants and wallets hang off
// it). A link says "this auth subject is that users row". See
// packages/iam/auth/src/canonical-user.ts.
//
// A subject is linked ONLY when all of these hold (anything else is reported,
// never guessed):
//   - the auth user's email is VERIFIED;
//   - exactly one Clerk-era `users` row (clerk_id set, different id) has that
//     email (case-insensitive);
//   - that row is not already linked to another subject;
//   - the subject has no `users` row of its own — OR it has one that is an
//     "orphan" (the mirror minted it with no email) and `--include-orphans` is
//     given. An orphan's own dependents are listed and left where they are:
//     moving or deleting data is a separate, reviewed step.
//
// Idempotent: a subject that already has a link is skipped; the insert is
// ON CONFLICT DO NOTHING. Dry-run by default; --apply writes, in one transaction.
//
// Usage:
//   DATABASE_URL=... node scripts/backfill-identity-links.mjs                       # dry run
//   DATABASE_URL=... node scripts/backfill-identity-links.mjs --include-orphans     # dry run, orphans in scope
//   DATABASE_URL=... node scripts/backfill-identity-links.mjs --include-orphans --apply
//
// Output never prints an email in full: addresses are masked.

import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

export function maskEmail(email) {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`;
}

/**
 * Pure planning step. Inputs are plain rows:
 *   authUsers: { id, email, email_verified }
 *   users:     { id, email, clerk_id }
 *   links:     { subject, user_id }
 * Returns { link: [...], review: [...], skipped: { reason: count } }.
 */
export function planLinks({ authUsers, users, links }, { includeOrphans = false } = {}) {
  const linked = new Set(links.map((l) => l.subject));
  const linkedTargets = new Set(links.map((l) => l.user_id));
  const userIds = new Set(users.map((u) => u.id));
  const legacyByEmail = new Map();
  for (const u of users) {
    if (!u.clerk_id || !u.email) continue;
    const key = u.email.trim().toLowerCase();
    legacyByEmail.set(key, [...(legacyByEmail.get(key) ?? []), u]);
  }
  const plan = { link: [], review: [], skipped: {} };
  const skip = (reason) => {
    plan.skipped[reason] = (plan.skipped[reason] ?? 0) + 1;
  };
  for (const a of authUsers) {
    if (linked.has(a.id)) {
      skip("already_linked");
      continue;
    }
    const email = a.email?.trim().toLowerCase();
    const candidates = email ? (legacyByEmail.get(email) ?? []).filter((u) => u.id !== a.id) : [];
    if (candidates.length === 0) {
      skip("no_legacy_row");
      continue;
    }
    if (!a.email_verified) {
      plan.review.push({ subject: a.id, reason: "unverified_email", email: maskEmail(a.email) });
      continue;
    }
    if (candidates.length > 1) {
      plan.review.push({
        subject: a.id,
        reason: "ambiguous_legacy_rows",
        email: maskEmail(a.email),
      });
      continue;
    }
    const target = candidates[0];
    if (linkedTargets.has(target.id)) {
      plan.review.push({
        subject: a.id,
        reason: "legacy_row_linked_to_another_subject",
        userId: target.id,
      });
      continue;
    }
    const orphan = userIds.has(a.id);
    if (orphan && !includeOrphans) {
      plan.review.push({
        subject: a.id,
        reason: "subject_has_own_users_row",
        userId: target.id,
        orphan: true,
      });
      continue;
    }
    plan.link.push({ subject: a.id, userId: target.id, email: maskEmail(a.email), orphan });
  }
  return plan;
}

/** Every column that references a users row, by FK or by convention, with row counts for one id. */
async function dependentsOf(client, userId) {
  const fks = (
    await client.query(
      `SELECT c.conrelid::regclass::text AS tbl, a.attname AS col
         FROM pg_constraint c
         JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.contype = 'f' AND c.confrelid = 'public.users'::regclass`,
    )
  ).rows;
  const out = {};
  for (const { tbl, col } of fks) {
    if (tbl === "user_identity_links") continue;
    const r = await client.query(`SELECT count(*)::int AS n FROM ${tbl} WHERE "${col}" = $1`, [
      userId,
    ]);
    if (r.rows[0].n > 0) out[`${tbl}.${col}`] = r.rows[0].n;
  }
  return out;
}

export async function runBackfill(client, { apply = false, includeOrphans = false } = {}) {
  const has = await client.query("SELECT to_regclass('public.user_identity_links') AS t");
  if (!has.rows[0].t)
    throw new Error(
      "user_identity_links does not exist: deploy the migration first (pnpm db:deploy).",
    );
  const authUsers = (await client.query("SELECT id, email, email_verified FROM auth_users")).rows;
  const users = (await client.query("SELECT id, email, clerk_id FROM users")).rows;
  const links = (
    await client.query(
      "SELECT subject, user_id FROM user_identity_links WHERE provider = 'better-auth'",
    )
  ).rows;
  const plan = planLinks({ authUsers, users, links }, { includeOrphans });

  for (const item of plan.link) {
    if (item.orphan) item.orphanDependents = await dependentsOf(client, item.subject);
    item.targetDependents = await dependentsOf(client, item.userId);
  }

  const written = [];
  if (apply && plan.link.length > 0) {
    await client.query("BEGIN");
    try {
      for (const item of plan.link) {
        const r = await client.query(
          `INSERT INTO user_identity_links (id, provider, subject, user_id, source)
           VALUES ($1, 'better-auth', $2, $3, 'backfill')
           ON CONFLICT (provider, subject) DO NOTHING`,
          [`bf_${randomBytes(12).toString("hex")}`, item.subject, item.userId],
        );
        if ((r.affectedRows ?? r.rowCount ?? 0) > 0) written.push(item.subject);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
  return {
    mode: apply ? "apply" : "dry-run",
    includeOrphans,
    counts: {
      authUsers: authUsers.length,
      users: users.length,
      existingLinks: links.length,
      toLink: plan.link.length,
      needsReview: plan.review.length,
      written: written.length,
      skipped: plan.skipped,
    },
    plan,
    written,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    process.stderr.write("DATABASE_URL is required.\n");
    process.exit(1);
  }
  const apply = process.argv.includes("--apply");
  const includeOrphans = process.argv.includes("--include-orphans");
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: url,
    ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const report = await runBackfill(client, { apply, includeOrphans });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await client.end();
  }
}
