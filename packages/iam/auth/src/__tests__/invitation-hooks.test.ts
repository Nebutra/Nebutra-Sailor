/**
 * Tests for ADR-12 Phase 2 — Better Auth `databaseHooks.invitation.create.before`.
 *
 * The hook populates two fields BA's `organization` plugin doesn't supply:
 *   - `token`       — 32-byte cryptographic random hex (256 bits of entropy)
 *   - `expiresAt`   — now() + 7 days (matches legacy INVITE_TTL_MS)
 *
 * It must NOT touch `createdAt` (Postgres column default handles it) or
 * `acceptedAt` / `declinedAt` (those are written by accept/decline flows).
 *
 * It must NOT overwrite caller-supplied `token` / `expiresAt` if BA passes
 * them — the hook's role is to backfill missing fields only.
 *
 * Also covers the `mergeDatabaseHooks` utility that combines the invitation
 * hooks with the existing audit-events hooks at the BA install site.
 */

import { describe, expect, it } from "vitest";

import { buildInvitationDatabaseHooks, mergeDatabaseHooks } from "../invitation-hooks";

// The shape BA passes to a create.before hook — a row object with the model's
// column properties. We don't import BA's types here; the hook is intentionally
// loose-typed to survive upstream churn.
interface InvitationRow {
  email: string;
  inviterId: string;
  organizationId: string;
  role?: string | null;
  status?: string;
  token?: string;
  expiresAt?: Date | string | null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function baseRow(): InvitationRow {
  return {
    email: "invitee@example.com",
    inviterId: "usr_inviter",
    organizationId: "org_acme",
    role: "member",
    status: "pending",
  };
}

async function runBefore(input: InvitationRow): Promise<InvitationRow> {
  const hooks = buildInvitationDatabaseHooks() as {
    invitation: {
      create: {
        before: (
          row: InvitationRow,
          ctx?: unknown,
        ) => Promise<{ data: InvitationRow } | InvitationRow>;
      };
    };
  };
  const result = await hooks.invitation.create.before(input, undefined);
  // BA's hook contract allows the hook to either return the row directly OR
  // return `{ data: row }`. We support both shapes — the implementation may
  // pick whichever the upstream contract currently expects.
  if (result && typeof result === "object" && "data" in result) {
    return (result as { data: InvitationRow }).data;
  }
  return result as InvitationRow;
}

describe("invitation-hooks — databaseHooks.invitation.create.before", () => {
  it("generates a token when BA does not pass one", async () => {
    const row = baseRow();
    const out = await runBefore(row);
    expect(out.token).toBeDefined();
    expect(typeof out.token).toBe("string");
    // 32 bytes hex-encoded -> 64 lowercase hex characters.
    expect(out.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("preserves a caller-supplied token (no overwrite)", async () => {
    const row: InvitationRow = { ...baseRow(), token: "caller_supplied_token_value" };
    const out = await runBefore(row);
    expect(out.token).toBe("caller_supplied_token_value");
  });

  it("sets expiresAt to ~7 days in the future when omitted", async () => {
    const before = Date.now();
    const out = await runBefore(baseRow());
    const after = Date.now();
    expect(out.expiresAt).toBeDefined();
    const expiresMs =
      out.expiresAt instanceof Date
        ? out.expiresAt.getTime()
        : new Date(out.expiresAt as string).getTime();
    // The expiry must fall within the call window + 7d (with 60s tolerance for
    // slow CI machines).
    expect(expiresMs).toBeGreaterThanOrEqual(before + SEVEN_DAYS_MS - 60_000);
    expect(expiresMs).toBeLessThanOrEqual(after + SEVEN_DAYS_MS + 60_000);
  });

  it("preserves a caller-supplied expiresAt", async () => {
    const customExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    const out = await runBefore({ ...baseRow(), expiresAt: customExpiry });
    const expiresMs =
      out.expiresAt instanceof Date
        ? out.expiresAt.getTime()
        : new Date(out.expiresAt as string).getTime();
    expect(expiresMs).toBe(customExpiry.getTime());
  });

  it("does not add unrelated fields nor remove input fields", async () => {
    const row = baseRow();
    const out = await runBefore(row);
    // All input fields preserved.
    expect(out.email).toBe(row.email);
    expect(out.inviterId).toBe(row.inviterId);
    expect(out.organizationId).toBe(row.organizationId);
    expect(out.role).toBe(row.role);
    expect(out.status).toBe(row.status);
    // Hook only adds the two fields it owns. No createdAt / acceptedAt /
    // declinedAt — those are populated elsewhere.
    const out2 = out as InvitationRow & {
      createdAt?: unknown;
      acceptedAt?: unknown;
      declinedAt?: unknown;
    };
    expect(out2.createdAt).toBeUndefined();
    expect(out2.acceptedAt).toBeUndefined();
    expect(out2.declinedAt).toBeUndefined();
  });

  it("produces a distinct token per call (no static seed bug)", async () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 32; i++) {
      const out = await runBefore(baseRow());
      tokens.add(out.token ?? "");
    }
    // All 32 tokens must be unique — collision probability with 256-bit random
    // is astronomically small.
    expect(tokens.size).toBe(32);
  });
});

describe("mergeDatabaseHooks", () => {
  it("merges non-overlapping table hooks via spread", () => {
    const auditFn = async () => undefined;
    const invFn = async () => undefined;
    const merged = mergeDatabaseHooks(
      { user: { update: { after: auditFn } } },
      { invitation: { create: { before: invFn } } },
    ) as Record<string, Record<string, Record<string, unknown>> | undefined>;
    expect(merged.user?.update?.after).toBe(auditFn);
    expect(merged.invitation?.create?.before).toBe(invFn);
  });

  it("right-source hooks for the same table.op.phase override left-source", () => {
    const leftFn = async () => "left";
    const rightFn = async () => "right";
    const merged = mergeDatabaseHooks(
      { invitation: { create: { before: leftFn } } },
      { invitation: { create: { before: rightFn } } },
    ) as Record<string, Record<string, Record<string, unknown>> | undefined>;
    expect(merged.invitation?.create?.before).toBe(rightFn);
  });
});
