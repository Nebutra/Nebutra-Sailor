/**
 * Tests for ADR-12 Phase 3b dual-read helper.
 *
 * Contract:
 *   - When a row exists in auth.invitation (BA), prefer it; mark source.
 *   - When only legacy public.OrganizationInvitation has the row, return it
 *     with the legacy source marker.
 *   - When both have it, BA wins (canonical going forward).
 *   - When neither has it, return null.
 *   - Update writes go to whichever table the source pointed to.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  findInvitationById,
  type NormalizedInvitation,
  updateInvitationStatus,
} from "../invitations";

interface FakeDb {
  bAInvitation: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  organizationInvitation: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

function makeDb(): FakeDb {
  return {
    bAInvitation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    organizationInvitation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe("findInvitationById — ADR-12 Phase 3b dual-read", () => {
  let db: FakeDb;

  beforeEach(() => {
    db = makeDb();
  });

  it("returns BA-shape invitation when only auth.invitation has the row", async () => {
    db.bAInvitation.findUnique.mockResolvedValue({
      id: "inv_ba_1",
      email: "alice@example.com",
      organizationId: "org_acme",
      role: "admin",
      status: "pending",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
    });
    db.organizationInvitation.findUnique.mockResolvedValue(null);

    const result = await findInvitationById("inv_ba_1", db as never);

    expect(result).toEqual({
      id: "inv_ba_1",
      email: "alice@example.com",
      organizationId: "org_acme",
      role: "admin",
      status: "pending",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      source: "auth.invitation",
    });
    // BA hit short-circuits — legacy is NOT consulted.
    expect(db.organizationInvitation.findUnique).not.toHaveBeenCalled();
  });

  it("falls back to legacy public.OrganizationInvitation when BA misses", async () => {
    db.bAInvitation.findUnique.mockResolvedValue(null);
    db.organizationInvitation.findUnique.mockResolvedValue({
      id: "inv_legacy_1",
      email: "bob@example.com",
      organizationId: "org_acme",
      role: "member",
      status: "pending",
      expiresAt: new Date("2026-06-02T00:00:00Z"),
    });

    const result = await findInvitationById("inv_legacy_1", db as never);

    expect(result).toEqual({
      id: "inv_legacy_1",
      email: "bob@example.com",
      organizationId: "org_acme",
      role: "member",
      status: "pending",
      expiresAt: new Date("2026-06-02T00:00:00Z"),
      source: "public.OrganizationInvitation",
    });
  });

  it("returns null when neither table has the row", async () => {
    db.bAInvitation.findUnique.mockResolvedValue(null);
    db.organizationInvitation.findUnique.mockResolvedValue(null);

    const result = await findInvitationById("inv_missing", db as never);

    expect(result).toBeNull();
  });

  it("normalizes BA's nullable role to 'member' so callers get a non-empty string", async () => {
    db.bAInvitation.findUnique.mockResolvedValue({
      id: "inv_ba_2",
      email: "alice@example.com",
      organizationId: "org_acme",
      role: null,
      status: "pending",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
    });

    const result = await findInvitationById("inv_ba_2", db as never);

    expect(result?.role).toBe("member");
  });

  it("treats BA's null expiresAt as already-expired (epoch) so the existing path handles it", async () => {
    db.bAInvitation.findUnique.mockResolvedValue({
      id: "inv_ba_3",
      email: "alice@example.com",
      organizationId: "org_acme",
      role: "admin",
      status: "pending",
      expiresAt: null,
    });

    const result = await findInvitationById("inv_ba_3", db as never);

    expect(result?.expiresAt.getTime()).toBe(0);
  });
});

describe("updateInvitationStatus — ADR-12 Phase 3b mirrors the read", () => {
  let db: FakeDb;

  beforeEach(() => {
    db = makeDb();
    db.bAInvitation.update.mockResolvedValue({});
    db.organizationInvitation.update.mockResolvedValue({});
  });

  it("updates auth.invitation when the source is auth.invitation", async () => {
    const inv: NormalizedInvitation = {
      id: "inv_ba_1",
      email: "alice@example.com",
      organizationId: "org_acme",
      role: "admin",
      status: "pending",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      source: "auth.invitation",
    };
    const acceptedAt = new Date("2026-05-15T00:00:00Z");

    await updateInvitationStatus(inv, { status: "accepted", acceptedAt }, db as never);

    expect(db.bAInvitation.update).toHaveBeenCalledWith({
      where: { id: "inv_ba_1" },
      data: { status: "accepted", acceptedAt },
    });
    expect(db.organizationInvitation.update).not.toHaveBeenCalled();
  });

  it("updates legacy public.OrganizationInvitation when the source is legacy", async () => {
    const inv: NormalizedInvitation = {
      id: "inv_legacy_1",
      email: "bob@example.com",
      organizationId: "org_acme",
      role: "member",
      status: "pending",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      source: "public.OrganizationInvitation",
    };
    const declinedAt = new Date("2026-05-15T00:00:00Z");

    await updateInvitationStatus(inv, { status: "declined", declinedAt }, db as never);

    expect(db.organizationInvitation.update).toHaveBeenCalledWith({
      where: { id: "inv_legacy_1" },
      data: { status: "declined", declinedAt },
    });
    expect(db.bAInvitation.update).not.toHaveBeenCalled();
  });

  it("supports status-only updates (no acceptedAt / declinedAt)", async () => {
    const inv: NormalizedInvitation = {
      id: "inv_legacy_2",
      email: "bob@example.com",
      organizationId: "org_acme",
      role: "member",
      status: "pending",
      expiresAt: new Date(0),
      source: "public.OrganizationInvitation",
    };

    await updateInvitationStatus(inv, { status: "expired" }, db as never);

    expect(db.organizationInvitation.update).toHaveBeenCalledWith({
      where: { id: "inv_legacy_2" },
      data: { status: "expired" },
    });
  });
});
