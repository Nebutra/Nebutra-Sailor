import "server-only";

import { logger } from "@nebutra/logger";

/**
 * Helpers for wiring external admin tools onto a read-only database
 * connection. The package never imports Prisma/pg directly — consumers pass
 * a client they already own. We only own (a) URL resolution and (b) a
 * transactional probe that confirms the session is actually read-only.
 */

let warnedFallback = false;

/**
 * Resolve the database URL to hand to admin tooling. Prefers an explicit
 * read-only replica; falls back to the primary with a one-time warning so
 * misconfig is loud but not fatal in dev.
 */
export function getReadonlyDbUrl(): string | null {
  const readonly = process.env.READONLY_DATABASE_URL;
  if (readonly && readonly.length > 0) return readonly;

  const primary = process.env.DATABASE_URL;
  if (primary && primary.length > 0) {
    if (!warnedFallback) {
      warnedFallback = true;
      logger.warn(
        "[admin-tooling] READONLY_DATABASE_URL not set — falling back to DATABASE_URL. " +
          "Admin tools will hit the primary; configure a replica before production.",
      );
    }
    return primary;
  }
  return null;
}

/**
 * Minimal shape any SQL client we accept must support. Both Prisma's
 * `$queryRawUnsafe` and a node-postgres `query()` satisfy this when wrapped.
 */
export interface ReadonlyDbProbe {
  query: (sql: string) => Promise<unknown>;
}

export interface ValidateReadonlyAccessResult {
  readOnly: boolean;
  rawValue: string | null;
}

/**
 * Run `SELECT current_setting('transaction_read_only')` against the client to
 * confirm the connection actually rejects writes. Returns the parsed result;
 * throws only on transport errors.
 */
export async function validateReadonlyAccess(
  db: ReadonlyDbProbe,
): Promise<ValidateReadonlyAccessResult> {
  const raw = await db.query("SELECT current_setting('transaction_read_only') AS read_only");
  const value = extractScalar(raw);
  return {
    readOnly: value === "on",
    rawValue: value,
  };
}

function extractScalar(raw: unknown): string | null {
  if (!raw) return null;
  // node-postgres shape: { rows: [{ read_only: 'on' }] }
  if (typeof raw === "object" && raw !== null && "rows" in raw) {
    const rows = (raw as { rows: unknown }).rows;
    if (Array.isArray(rows) && rows.length > 0) {
      const first = rows[0] as Record<string, unknown>;
      const v = first.read_only ?? first.readOnly ?? Object.values(first)[0];
      return typeof v === "string" ? v : v == null ? null : String(v);
    }
  }
  // Prisma $queryRawUnsafe shape: [{ read_only: 'on' }]
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0] as Record<string, unknown>;
    const v = first.read_only ?? first.readOnly ?? Object.values(first)[0];
    return typeof v === "string" ? v : v == null ? null : String(v);
  }
  return null;
}
