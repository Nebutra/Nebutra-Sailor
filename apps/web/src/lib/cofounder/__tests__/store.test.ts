import { beforeEach, describe, expect, it } from "vitest";
import {
  type CofounderDb,
  type CofounderInterestRow,
  type CofounderProfileRow,
  getCofounderProfile,
  listDiscoverPool,
  listMatches,
  recordInterest,
  upsertCofounderProfile,
} from "../store";

/**
 * In-memory fake of the narrow CofounderDb seam — mirrors Prisma semantics for
 * the delegate methods the store uses, so the repository logic is verified
 * without a database.
 */
function makeFakeDb() {
  const profiles = new Map<string, CofounderProfileRow>(); // keyed by tenantId
  const interests: CofounderInterestRow[] = [];
  let clock = 0;
  const now = () => new Date(2026, 5, 5, 0, 0, clock++);

  const db: CofounderDb = {
    cofounderProfile: {
      async findUnique({ where }) {
        return profiles.get(where.tenantId) ?? null;
      },
      async findMany({ where, orderBy, take }) {
        let rows = [...profiles.values()];
        if (where.isActive !== undefined) rows = rows.filter((r) => r.isActive === where.isActive);
        if (where.id?.notIn) rows = rows.filter((r) => !where.id?.notIn?.includes(r.id));
        if (where.id?.in) rows = rows.filter((r) => where.id?.in?.includes(r.id));
        if (orderBy?.updatedAt === "desc") {
          rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        }
        return take ? rows.slice(0, take) : rows;
      },
      async upsert({ where, create, update }) {
        const existing = profiles.get(where.tenantId);
        const row: CofounderProfileRow = existing
          ? { ...existing, ...update, archetype: update.archetype ?? null, updatedAt: now() }
          : {
              id: `prof_${where.tenantId}`,
              createdAt: now(),
              updatedAt: now(),
              ...create,
              archetype: create.archetype ?? null,
            };
        profiles.set(where.tenantId, row);
        return row;
      },
      async update({ where, data }) {
        const existing = profiles.get(where.tenantId);
        if (!existing) throw new Error("not found");
        const row = { ...existing, ...data, updatedAt: now() };
        profiles.set(where.tenantId, row);
        return row;
      },
    },
    cofounderInterest: {
      async findMany({ where }) {
        return interests.filter(
          (r) =>
            (where.fromProfileId === undefined || r.fromProfileId === where.fromProfileId) &&
            (where.toProfileId === undefined || r.toProfileId === where.toProfileId) &&
            (where.kind === undefined || r.kind === where.kind),
        );
      },
      async upsert({ where, create, update }) {
        const idx = interests.findIndex(
          (r) =>
            r.fromProfileId === where.fromProfileId_toProfileId.fromProfileId &&
            r.toProfileId === where.fromProfileId_toProfileId.toProfileId,
        );
        if (idx >= 0) {
          const row = {
            ...interests[idx],
            ...update,
            pitch: update.pitch ?? null,
          } as CofounderInterestRow;
          interests[idx] = row;
          return row;
        }
        const row: CofounderInterestRow = {
          id: `int_${create.fromProfileId}_${create.toProfileId}`,
          createdAt: now(),
          ...create,
          pitch: create.pitch ?? null,
        };
        interests.push(row);
        return row;
      },
    },
  };

  return { db };
}

async function seedProfile(db: CofounderDb, tenantId: string, isActive = true) {
  return upsertCofounderProfile(db, {
    tenantId,
    userId: `user_${tenantId}`,
    profile: { arena: "AI SaaS", headline: `${tenantId} company — building things` },
    isActive,
  });
}

describe("cofounder store", () => {
  let db: CofounderDb;
  beforeEach(() => {
    db = makeFakeDb().db;
  });

  it("upserts and reads back an opted-in profile", async () => {
    await seedProfile(db, "org_a");
    const profile = await getCofounderProfile(db, "org_a");
    expect(profile?.isActive).toBe(true);
    expect(profile?.arena).toBe("AI SaaS");
    expect(profile?.archetype).toBeNull();
  });

  it("discover excludes self, inactive profiles, and already-acted profiles", async () => {
    const me = await seedProfile(db, "org_me");
    const other = await seedProfile(db, "org_other");
    await seedProfile(db, "org_inactive", false);
    const passed = await seedProfile(db, "org_passed");
    await recordInterest(db, { fromProfileId: me.id, toProfileId: passed.id, kind: "PASS" });

    const pool = await listDiscoverPool(db, { viewerProfileId: me.id });
    const ids = pool.map((p) => p.id);
    expect(ids).toContain(other.id);
    expect(ids).not.toContain(me.id);
    expect(ids).not.toContain(passed.id);
    expect(ids.some((id) => id === "prof_org_inactive")).toBe(false);
  });

  it("mutual interest produces a match; one-sided does not", async () => {
    const me = await seedProfile(db, "org_me");
    const them = await seedProfile(db, "org_them");
    const stranger = await seedProfile(db, "org_stranger");

    await recordInterest(db, { fromProfileId: me.id, toProfileId: them.id, kind: "INTERESTED" });
    await recordInterest(db, {
      fromProfileId: me.id,
      toProfileId: stranger.id,
      kind: "INTERESTED",
    });
    // them likes me back → match; stranger never does → no match
    await recordInterest(db, { fromProfileId: them.id, toProfileId: me.id, kind: "PITCH" });

    const matches = await listMatches(db, me.id);
    expect(matches.map((m) => m.id)).toEqual([them.id]);
  });

  it("a PASS never counts as a match", async () => {
    const me = await seedProfile(db, "org_me");
    const them = await seedProfile(db, "org_them");
    await recordInterest(db, { fromProfileId: me.id, toProfileId: them.id, kind: "INTERESTED" });
    await recordInterest(db, { fromProfileId: them.id, toProfileId: me.id, kind: "PASS" });

    expect(await listMatches(db, me.id)).toEqual([]);
  });
});
