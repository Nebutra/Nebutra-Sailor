/**
 * Better Auth `databaseHooks.invitation.create.before` — populate the
 * additive ADR-12 Phase 1 fields the `organization` plugin doesn't supply.
 *
 * The hook is intentionally additive-only:
 *   - generates `token` (32-byte hex, 256 bits) if missing
 *   - sets `expiresAt` to now() + 7 days if missing
 *   - does NOT touch `createdAt` (Postgres column DEFAULT handles it)
 *   - does NOT touch `acceptedAt` / `declinedAt` (written by accept/decline)
 *   - does NOT overwrite caller-supplied values for token / expiresAt
 *
 * It must never throw — a hook failure would surface to the caller and break
 * the invitation flow. We do the minimum work in the hook and let the DB
 * decide whether the row is valid.
 *
 * The hook returns the row with the new fields merged in via spread (no
 * mutation). BA's contract allows the hook to return either the row directly
 * or `{ data: row }`; we return `{ data: row }` because that is the documented
 * shape for transforming the input prior to DB write.
 */

import { randomBytes } from "node:crypto";

// Use the same INVITE_TTL_MS value as the legacy
// `apps/web/src/app/api/onboarding/invite-members/route.ts` for parity with
// public.OrganizationInvitation's expiry semantics during the dual-write
// period (ADR-12 Phase 2 → 3).
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const TOKEN_BYTES = 32; // 256 bits of entropy — well above security minimum

interface InvitationRow {
  readonly [key: string]: unknown;
  token?: string;
  expiresAt?: Date | string | null;
}

/**
 * Build the Better Auth `databaseHooks` partial covering the `invitation`
 * table. Returned as `unknown` to keep the import surface narrow and decoupled
 * from upstream BA type churn — the install site casts to BA's option shape.
 */
export function buildInvitationDatabaseHooks(): unknown {
  return {
    invitation: {
      create: {
        before: async (row: InvitationRow): Promise<{ data: InvitationRow }> => {
          // Backfill `token` only if the caller didn't pass one. The legacy
          // accept-by-link flow needs a high-entropy random token; we never
          // generate cuids here.
          const token =
            typeof row.token === "string" && row.token.length > 0
              ? row.token
              : randomBytes(TOKEN_BYTES).toString("hex");

          // Backfill `expiresAt` only if the caller didn't pass one. A passed
          // expiresAt is honored even if it is in the past — that is the
          // caller's responsibility, not the hook's.
          const expiresAt =
            row.expiresAt !== undefined && row.expiresAt !== null
              ? row.expiresAt
              : new Date(Date.now() + INVITE_TTL_MS);

          return {
            data: {
              ...row,
              token,
              expiresAt,
            },
          };
        },
      },
    },
  };
}

/**
 * Shallow-merge two Better Auth `databaseHooks` records.
 *
 * BA's contract: `databaseHooks` is a nested record of
 *   `{ <table>: { <op>: { before?, after? } } }`.
 *
 * We merge at the `table.op.phase` level — right-source overrides left-source
 * for the same triple. Today there are no collisions between the audit-events
 * hooks (touch `user` + `account`) and the invitation hooks (touch
 * `invitation`), so the merge is effectively a deep-spread; the override
 * branch exists for future-proofing.
 *
 * Returned as `unknown` because BA's type lives in `@better-auth/core` and
 * the install site already casts.
 */
export function mergeDatabaseHooks(left: unknown, right: unknown): unknown {
  const a = (left ?? {}) as Record<string, Record<string, Record<string, unknown>>>;
  const b = (right ?? {}) as Record<string, Record<string, Record<string, unknown>>>;
  const merged: Record<string, Record<string, Record<string, unknown>>> = {};

  const tableKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const table of tableKeys) {
    const aOps = a[table] ?? {};
    const bOps = b[table] ?? {};
    const opKeys = new Set([...Object.keys(aOps), ...Object.keys(bOps)]);
    const mergedOps: Record<string, Record<string, unknown>> = {};
    for (const op of opKeys) {
      mergedOps[op] = {
        ...(aOps[op] ?? {}),
        ...(bOps[op] ?? {}),
      };
    }
    merged[table] = mergedOps;
  }

  return merged;
}
