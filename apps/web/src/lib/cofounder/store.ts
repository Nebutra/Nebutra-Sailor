import type { CofounderProfileInput } from "@/lib/cofounder/profile";

/**
 * Repository seam for Match-Your-Cofounder persistence. The narrow `CofounderDb`
 * interface mirrors only the Prisma delegate methods this module uses, so the
 * store is unit-testable with an in-memory fake (same pattern as the Startup OS
 * `StartupOSDb` seam). Route handlers cast the tenant-scoped Prisma client to
 * `CofounderDb`; RLS keeps reads/writes tenant-bounded at the database layer.
 */
export type CofounderInterestKind = "PASS" | "INTERESTED" | "PITCH";

export interface CofounderProfileRow {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly archetype: string | null;
  readonly arena: string;
  readonly headline: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CofounderInterestRow {
  readonly id: string;
  readonly fromProfileId: string;
  readonly toProfileId: string;
  readonly kind: CofounderInterestKind;
  readonly pitch: string | null;
  readonly createdAt: Date;
}

export interface CofounderDb {
  readonly cofounderProfile: {
    findUnique(args: {
      where: { tenantId: string };
    }): Promise<CofounderProfileRow | null>;
    findMany(args: {
      where: { isActive?: boolean; id?: { notIn?: string[]; in?: string[] } };
      orderBy?: { updatedAt: "asc" | "desc" };
      take?: number;
    }): Promise<CofounderProfileRow[]>;
    upsert(args: {
      where: { tenantId: string };
      create: {
        tenantId: string;
        userId: string;
        arena: string;
        headline: string;
        archetype?: string | null;
        isActive: boolean;
      };
      update: {
        userId: string;
        arena: string;
        headline: string;
        archetype?: string | null;
        isActive: boolean;
      };
    }): Promise<CofounderProfileRow>;
    update(args: {
      where: { tenantId: string };
      data: { isActive: boolean };
    }): Promise<CofounderProfileRow>;
  };
  readonly cofounderInterest: {
    findMany(args: {
      where: {
        fromProfileId?: string;
        toProfileId?: string;
        kind?: CofounderInterestKind;
      };
    }): Promise<CofounderInterestRow[]>;
    upsert(args: {
      where: { fromProfileId_toProfileId: { fromProfileId: string; toProfileId: string } };
      create: {
        fromProfileId: string;
        toProfileId: string;
        kind: CofounderInterestKind;
        pitch?: string | null;
      };
      update: { kind: CofounderInterestKind; pitch?: string | null };
    }): Promise<CofounderInterestRow>;
  };
}

export async function getCofounderProfile(
  db: CofounderDb,
  tenantId: string,
): Promise<CofounderProfileRow | null> {
  return db.cofounderProfile.findUnique({ where: { tenantId } });
}

export async function upsertCofounderProfile(
  db: CofounderDb,
  params: { tenantId: string; userId: string; profile: CofounderProfileInput; isActive: boolean },
): Promise<CofounderProfileRow> {
  const { tenantId, userId, profile, isActive } = params;
  const archetype = profile.archetype ?? null;
  return db.cofounderProfile.upsert({
    where: { tenantId },
    create: {
      tenantId,
      userId,
      arena: profile.arena,
      headline: profile.headline,
      archetype,
      isActive,
    },
    update: {
      userId,
      arena: profile.arena,
      headline: profile.headline,
      archetype,
      isActive,
    },
  });
}

export async function setCofounderProfileActive(
  db: CofounderDb,
  tenantId: string,
  isActive: boolean,
): Promise<CofounderProfileRow> {
  return db.cofounderProfile.update({ where: { tenantId }, data: { isActive } });
}

/**
 * Active pool the viewer hasn't acted on yet (their own row and every profile
 * they already passed/liked/pitched are excluded). Newest first. Honest empty:
 * an empty pool returns `[]`, never a fabricated card.
 */
export async function listDiscoverPool(
  db: CofounderDb,
  params: { viewerProfileId: string; limit?: number },
): Promise<CofounderProfileRow[]> {
  const { viewerProfileId, limit = 20 } = params;
  const acted = await db.cofounderInterest.findMany({ where: { fromProfileId: viewerProfileId } });
  const excluded = [viewerProfileId, ...acted.map((row) => row.toProfileId)];
  return db.cofounderProfile.findMany({
    where: { isActive: true, id: { notIn: excluded } },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function recordInterest(
  db: CofounderDb,
  params: {
    fromProfileId: string;
    toProfileId: string;
    kind: CofounderInterestKind;
    pitch?: string;
  },
): Promise<CofounderInterestRow> {
  const { fromProfileId, toProfileId, kind } = params;
  const pitch = params.pitch?.trim() || null;
  return db.cofounderInterest.upsert({
    where: { fromProfileId_toProfileId: { fromProfileId, toProfileId } },
    create: { fromProfileId, toProfileId, kind, pitch },
    update: { kind, pitch },
  });
}

/**
 * A match is mutual INTERESTED (either side may have escalated to PITCH, which
 * also counts as interest). Returns the matched counterpart profiles.
 */
export async function listMatches(
  db: CofounderDb,
  profileId: string,
): Promise<CofounderProfileRow[]> {
  const isInterested = (kind: CofounderInterestKind) => kind === "INTERESTED" || kind === "PITCH";
  const [outgoing, incoming] = await Promise.all([
    db.cofounderInterest.findMany({ where: { fromProfileId: profileId } }),
    db.cofounderInterest.findMany({ where: { toProfileId: profileId } }),
  ]);
  const likedByMe = new Set(outgoing.filter((r) => isInterested(r.kind)).map((r) => r.toProfileId));
  const matchedIds = incoming
    .filter((r) => isInterested(r.kind) && likedByMe.has(r.fromProfileId))
    .map((r) => r.fromProfileId);
  if (matchedIds.length === 0) return [];
  return db.cofounderProfile.findMany({ where: { id: { in: matchedIds } } });
}
