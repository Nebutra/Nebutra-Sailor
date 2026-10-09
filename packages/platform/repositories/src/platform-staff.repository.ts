import type { PlatformStaffRole as DbRole, PrismaClient } from "@nebutra/db";

/**
 * Platform staff grants — who may operate the platform itself.
 *
 * PlatformStaff is platform-scope (`@rls deny`), not tenant data, so this takes
 * the system client. Every method here is a mechanism; WHO may call it is the
 * caller's decision (the gateway's staff service checks `canPlatform`).
 *
 * Revocation is a tombstone (`revokedAt`), never a delete: the audit trail must
 * still be able to explain an action taken while the grant was live. A re-grant
 * clears the tombstone and rewrites role, grantor and note on the same row —
 * the earlier grant survives in the audit log, not in this table.
 */

export interface StaffRow {
  userId: string;
  role: DbRole;
  email: string | null;
  name: string | null;
  grantedById: string | null;
  grantedByEmail: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
  note: string | null;
}

export type StaffGuardReason = "last_owner" | "not_found" | "already_revoked";

/** A refused write. `reason` is stable so callers can map it to a status code. */
export class StaffGuardError extends Error {
  constructor(
    readonly reason: StaffGuardReason,
    message: string,
  ) {
    super(message);
    this.name = "StaffGuardError";
  }
}

export interface GrantInput {
  userId: string;
  role: DbRole;
  grantedById: string;
  note: string;
}

export interface RevokeInput {
  userId: string;
  note: string;
}

export interface StaffGrantResult {
  row: StaffRow;
  /** The grant before this write, or null when the person was never staff. */
  previous: { role: DbRole; revokedAt: Date | null } | null;
}

export class PlatformStaffRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserByEmail(email: string): Promise<{ id: string; email: string | null } | null> {
    return this.prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
      select: { id: true, email: true },
    });
  }

  async findUserById(id: string): Promise<{ id: string; email: string | null } | null> {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  }

  /** The caller's ACTIVE grant, or null for "not staff" in every sense (none, tombstoned). */
  async findActive(userId: string): Promise<{ role: DbRole } | null> {
    const row = await this.prisma.platformStaff.findUnique({
      where: { userId },
      select: { role: true, revokedAt: true },
    });
    return row && row.revokedAt === null ? { role: row.role } : null;
  }

  async countActiveOwners(): Promise<number> {
    return this.prisma.platformStaff.count({
      where: { role: "PLATFORM_OWNER", revokedAt: null },
    });
  }

  /** Every grant, tombstones included, active first then newest. */
  async list(): Promise<StaffRow[]> {
    const rows = await this.prisma.platformStaff.findMany({
      orderBy: [{ revokedAt: { sort: "asc", nulls: "first" } }, { grantedAt: "desc" }],
      include: { user: { select: { email: true, name: true } } },
    });
    return this.withGrantors(rows);
  }

  async get(userId: string): Promise<StaffRow | null> {
    const row = await this.prisma.platformStaff.findUnique({
      where: { userId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!row) return null;
    const [view] = await this.withGrantors([row]);
    return view ?? null;
  }

  /**
   * Create or change a grant. Demoting the only active owner is refused inside
   * the same serializable transaction that counts owners, so two concurrent
   * demotions cannot both pass the check.
   */
  async grant(input: GrantInput): Promise<StaffGrantResult> {
    const previous = await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.platformStaff.findUnique({ where: { userId: input.userId } });
        if (
          existing &&
          existing.revokedAt === null &&
          existing.role === "PLATFORM_OWNER" &&
          input.role !== "PLATFORM_OWNER"
        ) {
          const owners = await tx.platformStaff.count({
            where: { role: "PLATFORM_OWNER", revokedAt: null },
          });
          if (owners <= 1) {
            throw new StaffGuardError(
              "last_owner",
              "This is the last active platform owner. Grant another owner first.",
            );
          }
        }
        await tx.platformStaff.upsert({
          where: { userId: input.userId },
          create: {
            userId: input.userId,
            role: input.role,
            grantedById: input.grantedById,
            note: input.note,
          },
          update: {
            role: input.role,
            grantedById: input.grantedById,
            grantedAt: new Date(),
            revokedAt: null,
            note: input.note,
          },
        });
        return existing ? { role: existing.role, revokedAt: existing.revokedAt } : null;
      },
      { isolationLevel: "Serializable" },
    );
    // Re-read rather than trust the transaction's inputs: the response is the stored row.
    const row = await this.get(input.userId);
    if (!row) throw new StaffGuardError("not_found", "The grant was not stored.");
    return { row, previous };
  }

  /** Tombstone a grant. The last active owner cannot be revoked. */
  async revoke(input: RevokeInput): Promise<StaffRow> {
    await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.platformStaff.findUnique({ where: { userId: input.userId } });
        if (!existing) throw new StaffGuardError("not_found", "That person was never staff.");
        if (existing.revokedAt !== null) {
          throw new StaffGuardError("already_revoked", "That grant is already revoked.");
        }
        if (existing.role === "PLATFORM_OWNER") {
          const owners = await tx.platformStaff.count({
            where: { role: "PLATFORM_OWNER", revokedAt: null },
          });
          if (owners <= 1) {
            throw new StaffGuardError(
              "last_owner",
              "This is the last active platform owner. Grant another owner first.",
            );
          }
        }
        await tx.platformStaff.update({
          where: { userId: input.userId },
          data: { revokedAt: new Date(), note: input.note },
        });
      },
      { isolationLevel: "Serializable" },
    );
    const row = await this.get(input.userId);
    if (!row) throw new StaffGuardError("not_found", "That person was never staff.");
    return row;
  }

  private async withGrantors(
    rows: Array<{
      userId: string;
      role: DbRole;
      grantedById: string | null;
      grantedAt: Date;
      revokedAt: Date | null;
      note: string | null;
      user: { email: string | null; name: string | null };
    }>,
  ): Promise<StaffRow[]> {
    const ids = [...new Set(rows.flatMap((r) => (r.grantedById ? [r.grantedById] : [])))];
    const grantors = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, email: true },
        })
      : [];
    const emailOf = new Map(grantors.map((g) => [g.id, g.email]));
    return rows.map((r) => ({
      userId: r.userId,
      role: r.role,
      email: r.user.email,
      name: r.user.name,
      grantedById: r.grantedById,
      grantedByEmail: r.grantedById ? (emailOf.get(r.grantedById) ?? null) : null,
      grantedAt: r.grantedAt,
      revokedAt: r.revokedAt,
      note: r.note,
    }));
  }
}
