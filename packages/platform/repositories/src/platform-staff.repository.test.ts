import { describe, expect, it } from "vitest";
import { PlatformStaffRepository, StaffGuardError } from "./platform-staff.repository";
import { createInMemoryPlatformStaffDb } from "./platform-staff.testing";

const users = [
  { id: "u_owner", email: "owner@example.com", name: "Owner" },
  { id: "u_ops", email: "ops@example.com", name: "Ops" },
  { id: "u_new", email: "New@Example.com", name: "New" },
];

function setup() {
  const db = createInMemoryPlatformStaffDb({
    users,
    staff: [{ userId: "u_owner", role: "PLATFORM_OWNER", note: "bootstrap" }],
  });
  return { ...db, repo: new PlatformStaffRepository(db.prisma) };
}

describe("PlatformStaffRepository", () => {
  it("finds users by email case-insensitively", async () => {
    const { repo } = setup();
    expect((await repo.findUserByEmail(" new@example.COM "))?.id).toBe("u_new");
    expect(await repo.findUserByEmail("nobody@example.com")).toBeNull();
  });

  it("treats a tombstoned grant as not staff", async () => {
    const { repo } = setup();
    await repo.grant({
      userId: "u_ops",
      role: "PLATFORM_OPERATOR",
      grantedById: "u_owner",
      note: "on-call",
    });
    expect(await repo.findActive("u_ops")).toEqual({ role: "PLATFORM_OPERATOR" });
    await repo.revoke({ userId: "u_ops", note: "rotated off" });
    expect(await repo.findActive("u_ops")).toBeNull();
  });

  it("revokes by tombstone: the row stays, with revokedAt and the note", async () => {
    const { repo, staff } = setup();
    await repo.grant({
      userId: "u_ops",
      role: "PLATFORM_OPERATOR",
      grantedById: "u_owner",
      note: "on-call",
    });
    const row = await repo.revoke({ userId: "u_ops", note: "rotated off" });
    expect(staff.has("u_ops")).toBe(true);
    expect(row.revokedAt).toBeInstanceOf(Date);
    expect(row.note).toBe("rotated off");
    expect(row.grantedByEmail).toBe("owner@example.com");
  });

  it("refuses to revoke twice", async () => {
    const { repo } = setup();
    await repo.grant({
      userId: "u_ops",
      role: "PLATFORM_OPERATOR",
      grantedById: "u_owner",
      note: "x",
    });
    await repo.revoke({ userId: "u_ops", note: "x" });
    await expect(repo.revoke({ userId: "u_ops", note: "x" })).rejects.toMatchObject({
      reason: "already_revoked",
    });
  });

  it("refuses to revoke someone who was never staff", async () => {
    const { repo } = setup();
    await expect(repo.revoke({ userId: "u_new", note: "x" })).rejects.toBeInstanceOf(
      StaffGuardError,
    );
  });

  it("refuses to revoke the last active owner, and leaves the row untouched", async () => {
    const { repo, staff } = setup();
    await expect(repo.revoke({ userId: "u_owner", note: "x" })).rejects.toMatchObject({
      reason: "last_owner",
    });
    expect(staff.get("u_owner")?.revokedAt).toBeNull();
  });

  it("allows revoking an owner once another owner exists", async () => {
    const { repo } = setup();
    await repo.grant({
      userId: "u_ops",
      role: "PLATFORM_OWNER",
      grantedById: "u_owner",
      note: "co-owner",
    });
    const row = await repo.revoke({ userId: "u_owner", note: "stepping down" });
    expect(row.revokedAt).not.toBeNull();
    expect(await repo.countActiveOwners()).toBe(1);
  });

  it("refuses to demote the last owner", async () => {
    const { repo } = setup();
    await expect(
      repo.grant({
        userId: "u_owner",
        role: "PLATFORM_OPERATOR",
        grantedById: "u_owner",
        note: "x",
      }),
    ).rejects.toMatchObject({ reason: "last_owner" });
  });

  it("re-granting a tombstoned person clears the tombstone and reports the previous grant", async () => {
    const { repo } = setup();
    await repo.grant({
      userId: "u_ops",
      role: "PLATFORM_SUPPORT",
      grantedById: "u_owner",
      note: "a",
    });
    await repo.revoke({ userId: "u_ops", note: "b" });
    const result = await repo.grant({
      userId: "u_ops",
      role: "PLATFORM_OPERATOR",
      grantedById: "u_owner",
      note: "c",
    });
    expect(result.row.revokedAt).toBeNull();
    expect(result.row.role).toBe("PLATFORM_OPERATOR");
    expect(result.previous?.revokedAt).toBeInstanceOf(Date);
  });

  it("lists grants with the person's email", async () => {
    const { repo } = setup();
    const rows = await repo.list();
    expect(rows[0]).toMatchObject({
      userId: "u_owner",
      email: "owner@example.com",
      revokedAt: null,
    });
  });
});
