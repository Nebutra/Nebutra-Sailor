import { getSystemDb, type PrismaClient } from "@nebutra/db";

/**
 * ADR-12 Phase 3b — Dual-read invitation lookup.
 *
 * During Phases 3-4 of ADR-12, two tables hold invitations:
 *
 *   - `auth.invitation` (BA org plugin, populated by Phase 2 hooks) — the
 *     canonical home for new invitations.
 *   - `public.OrganizationInvitation` (legacy, Clerk-era) — read-only data
 *     until Phase 4's write cutover and Phase 5's DROP TABLE.
 *
 * `findInvitationById` looks in BA first, falls back to legacy. The shape
 * returned is identical regardless of source so callers do not need to
 * branch — the only signal of provenance is the `source` field, which
 * exists purely for logging / future audit and SHOULD NOT influence the
 * business logic in the accept / decline / view flows.
 *
 * Reversal: drop the BA branch, restore the legacy-only read. No data
 * shape change, no migration.
 *
 * NOTE: `BAInvitation.token` and `BAInvitation.expiresAt` are still nullable
 * in Phase 1 / 2; the contract here mirrors the **legacy** shape, so when a
 * BA row is returned, callers must tolerate the (rare) case where the BA
 * hooks have not yet populated those fields. We default `expiresAt` to a
 * far-past timestamp in that case so the existing "expired" path kicks in
 * rather than crashing on `.getTime()`.
 */
export interface NormalizedInvitation {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  status: string;
  expiresAt: Date;
  source: "auth.invitation" | "public.OrganizationInvitation";
}

type SystemDb = ReturnType<typeof getSystemDb> | PrismaClient;

/**
 * Try `auth.invitation` first (new canonical home), fall back to
 * `public.OrganizationInvitation`. Returns `null` when neither has the row.
 *
 * @param db   The system Prisma client (defaults to `getSystemDb()`).
 * @param id   The invitation primary key — the route param `invitationId`.
 */
export async function findInvitationById(
  id: string,
  db: SystemDb = getSystemDb(),
): Promise<NormalizedInvitation | null> {
  // BA-shape lookup first. `findUnique` on the primary key is safe; ids never
  // collide across tables in practice (both use cuid, separate sequences).
  const ba = await db.bAInvitation.findUnique({ where: { id } });
  if (ba) {
    return {
      id: ba.id,
      email: ba.email,
      organizationId: ba.organizationId,
      // BA's `role` column is nullable; normalize to "member" so downstream
      // code can rely on a non-empty string (matches legacy default).
      role: ba.role ?? "member",
      status: ba.status,
      // BA's `expiresAt` is nullable during Phase 1-2; treat unset as already
      // expired so the "expired" branch handles it instead of crashing.
      expiresAt: ba.expiresAt ?? new Date(0),
      source: "auth.invitation",
    };
  }

  const legacy = await db.organizationInvitation.findUnique({ where: { id } });
  if (legacy) {
    return {
      id: legacy.id,
      email: legacy.email,
      organizationId: legacy.organizationId,
      role: legacy.role,
      status: legacy.status,
      expiresAt: legacy.expiresAt,
      source: "public.OrganizationInvitation",
    };
  }

  return null;
}

/**
 * Best-effort status update mirroring the dual-read. Updates whichever table
 * owns the invitation; safe to call inside the existing accept/decline flows
 * without changing their data-write semantics.
 *
 * Why this exists: keeping the legacy `OrganizationInvitation.status` correct
 * during Phase 3-4 is what lets the soak period observe "zero writes to
 * legacy" before Phase 5's DROP TABLE. New BA-sourced invitations get their
 * status updated on `auth.invitation`; legacy ones on the legacy table.
 */
export async function updateInvitationStatus(
  invitation: NormalizedInvitation,
  data: { status: string; acceptedAt?: Date; declinedAt?: Date },
  db: SystemDb = getSystemDb(),
): Promise<void> {
  if (invitation.source === "auth.invitation") {
    await db.bAInvitation.update({
      where: { id: invitation.id },
      data: {
        status: data.status,
        ...(data.acceptedAt !== undefined ? { acceptedAt: data.acceptedAt } : {}),
        ...(data.declinedAt !== undefined ? { declinedAt: data.declinedAt } : {}),
      },
    });
    return;
  }

  await db.organizationInvitation.update({
    where: { id: invitation.id },
    data: {
      status: data.status,
      ...(data.acceptedAt !== undefined ? { acceptedAt: data.acceptedAt } : {}),
      ...(data.declinedAt !== undefined ? { declinedAt: data.declinedAt } : {}),
    },
  });
}
