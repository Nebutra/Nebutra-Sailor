/**
 * Tests for the ADR-12 Phase 3a backfill script.
 *
 * We exercise the `backfillBaInvitations` function with an in-memory fake
 * that satisfies the `BackfillDb` structural interface. This avoids the
 * Prisma↔pglite wiring complexity that the migration tests already opted
 * out of (they use raw SQL for the same reason).
 */

import { describe, expect, it } from "vitest";
import {
  type BackfillDb,
  backfillBaInvitations,
  type LegacyInvitationRow,
} from "../backfill-ba-invitation";

interface BaRow {
  id: string;
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

/**
 * Build an in-memory fake DB seeded with the given rows. The fake mimics
 * just enough Prisma surface for the backfill to run.
 */
function makeFakeDb(
  legacy: LegacyInvitationRow[],
  baSeed: BaRow[] = [],
): {
  db: BackfillDb;
  ba: BaRow[];
} {
  const baRows: BaRow[] = [...baSeed];
  let baIdCounter = baRows.length + 1;

  const db: BackfillDb = {
    organizationInvitation: {
      async findMany(args) {
        const direction = args?.orderBy?.createdAt ?? "asc";
        const sorted = [...legacy].sort((a, b) => {
          const cmp = a.createdAt.getTime() - b.createdAt.getTime();
          return direction === "asc" ? cmp : -cmp;
        });
        return typeof args?.take === "number" ? sorted.slice(0, args.take) : sorted;
      },
    },
    bAInvitation: {
      async findFirst({ where }) {
        const found = baRows.find(
          (r) => r.email === where.email && r.organizationId === where.organizationId,
        );
        return found
          ? { id: found.id, email: found.email, organizationId: found.organizationId }
          : null;
      },
      async create({ data }) {
        const row: BaRow = {
          id: `ba_${baIdCounter++}`,
          email: data.email,
          organizationId: data.organizationId,
          role: data.role,
          status: data.status,
          inviterId: data.inviterId,
          token: data.token,
          expiresAt: data.expiresAt,
          acceptedAt: data.acceptedAt,
          declinedAt: data.declinedAt,
          createdAt: data.createdAt,
        };
        baRows.push(row);
        return { id: row.id, email: row.email, organizationId: row.organizationId };
      },
    },
  };

  return { db, ba: baRows };
}

function legacyRow(overrides: Partial<LegacyInvitationRow> = {}): LegacyInvitationRow {
  return {
    id: "leg_1",
    email: "alice@example.com",
    organizationId: "org_acme",
    role: "member",
    status: "pending",
    inviterId: "usr_inviter",
    token: "tok_abc123",
    expiresAt: new Date("2026-06-01T00:00:00Z"),
    acceptedAt: null,
    declinedAt: null,
    createdAt: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  };
}

describe("backfillBaInvitations — ADR-12 Phase 3a", () => {
  it("migrates legacy rows with full field-by-field mapping", async () => {
    const legacy = [
      legacyRow({
        id: "leg_1",
        email: "alice@example.com",
        organizationId: "org_acme",
        role: "admin",
        status: "pending",
        inviterId: "usr_inviter_1",
        token: "tok_alice",
        expiresAt: new Date("2026-06-01T00:00:00Z"),
        acceptedAt: null,
        declinedAt: null,
        createdAt: new Date("2026-05-01T00:00:00Z"),
      }),
      legacyRow({
        id: "leg_2",
        email: "bob@example.com",
        organizationId: "org_acme",
        role: "member",
        status: "accepted",
        inviterId: "usr_inviter_2",
        token: "tok_bob",
        expiresAt: new Date("2026-06-02T00:00:00Z"),
        acceptedAt: new Date("2026-05-03T00:00:00Z"),
        declinedAt: null,
        createdAt: new Date("2026-05-02T00:00:00Z"),
      }),
    ];

    const { db, ba } = makeFakeDb(legacy);
    const result = await backfillBaInvitations({ db });

    expect(result).toEqual({
      totalLegacy: 2,
      alreadyPresent: 0,
      migrated: 2,
      skippedDuplicates: 0,
      dryRun: false,
    });

    expect(ba).toHaveLength(2);

    const alice = ba.find((r) => r.email === "alice@example.com");
    expect(alice).toBeDefined();
    expect(alice).toMatchObject({
      email: "alice@example.com",
      organizationId: "org_acme",
      role: "admin",
      status: "pending",
      inviterId: "usr_inviter_1",
      token: "tok_alice",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      acceptedAt: null,
      declinedAt: null,
      createdAt: new Date("2026-05-01T00:00:00Z"),
    });

    const bob = ba.find((r) => r.email === "bob@example.com");
    expect(bob).toBeDefined();
    expect(bob).toMatchObject({
      email: "bob@example.com",
      organizationId: "org_acme",
      role: "member",
      status: "accepted",
      inviterId: "usr_inviter_2",
      token: "tok_bob",
      acceptedAt: new Date("2026-05-03T00:00:00Z"),
      createdAt: new Date("2026-05-02T00:00:00Z"),
    });
  });

  it("dedupes legacy rows with the same (email, organizationId) — newest createdAt wins", async () => {
    const older = legacyRow({
      id: "leg_old",
      email: "dup@example.com",
      organizationId: "org_acme",
      token: "tok_old",
      createdAt: new Date("2026-05-01T00:00:00Z"),
    });
    const newer = legacyRow({
      id: "leg_new",
      email: "dup@example.com",
      organizationId: "org_acme",
      token: "tok_new",
      createdAt: new Date("2026-05-05T00:00:00Z"),
    });

    const { db, ba } = makeFakeDb([older, newer]);
    const result = await backfillBaInvitations({ db });

    expect(result).toMatchObject({
      totalLegacy: 2,
      migrated: 1,
      skippedDuplicates: 1,
      alreadyPresent: 0,
    });
    expect(ba).toHaveLength(1);
    expect(ba[0].token).toBe("tok_new");
  });

  it("is idempotent — re-running skips rows already present in auth.invitation", async () => {
    const legacy = [
      legacyRow({ id: "leg_1", email: "alice@example.com", organizationId: "org_acme" }),
    ];
    const { db, ba } = makeFakeDb(legacy);

    const first = await backfillBaInvitations({ db });
    expect(first.migrated).toBe(1);
    expect(first.alreadyPresent).toBe(0);
    expect(ba).toHaveLength(1);

    const second = await backfillBaInvitations({ db });
    expect(second).toMatchObject({
      totalLegacy: 1,
      migrated: 0,
      alreadyPresent: 1,
      skippedDuplicates: 0,
      dryRun: false,
    });
    expect(ba).toHaveLength(1);
  });

  it("dry-run makes no writes but reports counts as if it would have", async () => {
    const legacy = [
      legacyRow({ id: "leg_1", email: "alice@example.com", organizationId: "org_acme" }),
      legacyRow({ id: "leg_2", email: "bob@example.com", organizationId: "org_acme" }),
    ];
    const { db, ba } = makeFakeDb(legacy);

    const result = await backfillBaInvitations({ db, dryRun: true });

    expect(result).toEqual({
      totalLegacy: 2,
      alreadyPresent: 0,
      migrated: 2,
      skippedDuplicates: 0,
      dryRun: true,
    });
    expect(ba).toHaveLength(0);
  });

  it("honours --limit by capping how many legacy rows are read", async () => {
    const legacy = Array.from({ length: 5 }, (_, i) =>
      legacyRow({
        id: `leg_${i}`,
        email: `user${i}@example.com`,
        organizationId: "org_acme",
        createdAt: new Date(`2026-05-0${i + 1}T00:00:00Z`),
      }),
    );
    const { db, ba } = makeFakeDb(legacy);

    const result = await backfillBaInvitations({ db, limit: 2 });

    expect(result.totalLegacy).toBe(2);
    expect(result.migrated).toBe(2);
    expect(ba).toHaveLength(2);
    // ordered by createdAt ascending — earliest two go first
    expect(ba.map((r) => r.email).sort()).toEqual(["user0@example.com", "user1@example.com"]);
  });

  it("respects pre-existing auth.invitation rows (mixed already-present + new)", async () => {
    const legacy = [
      legacyRow({ id: "leg_1", email: "alice@example.com", organizationId: "org_acme" }),
      legacyRow({ id: "leg_2", email: "bob@example.com", organizationId: "org_acme" }),
    ];
    const seed: BaRow[] = [
      {
        id: "ba_seed",
        email: "alice@example.com",
        organizationId: "org_acme",
        role: "member",
        status: "pending",
        inviterId: "usr_inviter",
        token: "ba_alice_token",
        expiresAt: new Date("2026-06-01T00:00:00Z"),
        acceptedAt: null,
        declinedAt: null,
        createdAt: new Date("2026-05-01T00:00:00Z"),
      },
    ];

    const { db, ba } = makeFakeDb(legacy, seed);
    const result = await backfillBaInvitations({ db });

    expect(result).toMatchObject({
      totalLegacy: 2,
      migrated: 1,
      alreadyPresent: 1,
      skippedDuplicates: 0,
    });
    expect(ba).toHaveLength(2);
    expect(ba.find((r) => r.email === "alice@example.com")?.token).toBe("ba_alice_token");
    expect(ba.find((r) => r.email === "bob@example.com")?.token).toBe("tok_abc123");
  });
});
