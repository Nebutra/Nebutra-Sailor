import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CofounderDb, CofounderInterestRow, CofounderProfileRow } from "@/lib/cofounder/store";

const getCofounderContextMock = vi.fn();

vi.mock("@/lib/cofounder/context", () => ({
  getCofounderContext: getCofounderContextMock,
}));
vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

/** Minimal in-memory CofounderDb fake (mirrors Prisma semantics for these routes). */
function makeFakeDb() {
  const profiles = new Map<string, CofounderProfileRow>(); // keyed by tenantId
  const interests: CofounderInterestRow[] = [];
  let clock = 0;
  const now = () => new Date(2026, 5, 5, 0, 0, clock++);

  function seedProfile(tenantId: string, isActive = true): CofounderProfileRow {
    const row: CofounderProfileRow = {
      id: `prof_${tenantId}`,
      tenantId,
      userId: `user_${tenantId}`,
      archetype: null,
      arena: "AI SaaS",
      headline: `${tenantId} co — building`,
      isActive,
      createdAt: now(),
      updatedAt: now(),
    };
    profiles.set(tenantId, row);
    return row;
  }

  const db: CofounderDb = {
    cofounderProfile: {
      async findUnique({ where }) {
        return profiles.get(where.tenantId) ?? null;
      },
      async findMany({ where }) {
        let rows = [...profiles.values()];
        if (where.isActive !== undefined) rows = rows.filter((r) => r.isActive === where.isActive);
        if (where.id?.notIn) rows = rows.filter((r) => !where.id?.notIn?.includes(r.id));
        if (where.id?.in) rows = rows.filter((r) => where.id?.in?.includes(r.id));
        return rows;
      },
      async upsert() {
        throw new Error("not used");
      },
      async update({ where, data }) {
        const row = { ...(profiles.get(where.tenantId) as CofounderProfileRow), ...data };
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
          interests[idx] = { ...interests[idx], ...update, pitch: update.pitch ?? null };
          return interests[idx];
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

  return { db, seedProfile };
}

function asContext(db: CofounderDb, tenantId = "t_me", userId = "u_me") {
  return { tenantId, userId, db };
}

describe("/api/cofounder/discover", () => {
  beforeEach(() => {
    vi.resetModules();
    getCofounderContextMock.mockReset();
  });

  it("returns not-opted-in when the viewer has no active profile", async () => {
    const { db } = makeFakeDb();
    getCofounderContextMock.mockResolvedValue(asContext(db));
    const { GET } = await import("@/app/api/cofounder/discover/route");

    const res = await GET(new Request("http://localhost/api/cofounder/discover"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ cards: [], reason: "not-opted-in" });
  });

  it("returns the active pool excluding the viewer", async () => {
    const { db, seedProfile } = makeFakeDb();
    seedProfile("t_me");
    seedProfile("t_other");
    getCofounderContextMock.mockResolvedValue(asContext(db));
    const { GET } = await import("@/app/api/cofounder/discover/route");

    const res = await GET(new Request("http://localhost/api/cofounder/discover"));
    const body = (await res.json()) as { cards: Array<{ profileId: string }> };
    expect(body.cards.map((c) => c.profileId)).toEqual(["prof_t_other"]);
  });

  it("propagates the context's auth/flag response", async () => {
    const { NextResponse } = await import("next/server");
    getCofounderContextMock.mockResolvedValue({
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    });
    const { GET } = await import("@/app/api/cofounder/discover/route");

    const res = await GET(new Request("http://localhost/api/cofounder/discover"));
    expect(res.status).toBe(401);
  });
});

describe("/api/cofounder/interest", () => {
  beforeEach(() => {
    vi.resetModules();
    getCofounderContextMock.mockReset();
  });

  async function post(db: CofounderDb, body: unknown) {
    getCofounderContextMock.mockResolvedValue(asContext(db));
    const { POST } = await import("@/app/api/cofounder/interest/route");
    return POST(
      new Request("http://localhost/api/cofounder/interest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("409s when the viewer has not opted in", async () => {
    const { db } = makeFakeDb();
    const res = await post(db, { toProfileId: "prof_t_other", kind: "INTERESTED" });
    expect(res.status).toBe(409);
  });

  it("400s on signalling interest in yourself", async () => {
    const { db, seedProfile } = makeFakeDb();
    const me = seedProfile("t_me");
    const res = await post(db, { toProfileId: me.id, kind: "INTERESTED" });
    expect(res.status).toBe(400);
  });

  it("records a one-sided interest with matched:false", async () => {
    const { db, seedProfile } = makeFakeDb();
    seedProfile("t_me");
    seedProfile("t_other");
    const res = await post(db, { toProfileId: "prof_t_other", kind: "INTERESTED" });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ recorded: true, matched: false });
  });

  it("reports matched:true when the target already showed interest", async () => {
    const { db, seedProfile } = makeFakeDb();
    seedProfile("t_me");
    seedProfile("t_other");
    // The target already signalled interest in me (other -> me).
    await db.cofounderInterest.upsert({
      where: {
        fromProfileId_toProfileId: { fromProfileId: "prof_t_other", toProfileId: "prof_t_me" },
      },
      create: { fromProfileId: "prof_t_other", toProfileId: "prof_t_me", kind: "INTERESTED" },
      update: { kind: "INTERESTED" },
    });

    const res = await post(db, { toProfileId: "prof_t_other", kind: "INTERESTED" });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ recorded: true, matched: true });
  });

  it("400s on an invalid kind", async () => {
    const { db, seedProfile } = makeFakeDb();
    seedProfile("t_me");
    const res = await post(db, { toProfileId: "prof_t_other", kind: "MAYBE" });
    expect(res.status).toBe(400);
  });
});
