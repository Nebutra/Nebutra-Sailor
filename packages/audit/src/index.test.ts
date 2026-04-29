import { describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => {
    throw new Error("no db in unit tests");
  },
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { createPrismaStorage } = await import("./index.js");

describe("createPrismaStorage", () => {
  it("maps Prisma audit rows back to the public AuditEvent query contract", async () => {
    const createdAt = new Date("2026-04-29T09:00:00.000Z");
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "audit_1",
        action: "org.role_change",
        userId: "admin_1",
        actorType: "admin",
        organizationId: "org_1",
        entityType: "user",
        entityId: "user_2",
        metadata: JSON.stringify({ oldRole: "member", newRole: "admin" }),
        ipAddress: "203.0.113.10",
        userAgent: "Vitest",
        outcome: "success",
        reason: null,
        createdAt,
      },
    ]);

    const storage = createPrismaStorage({
      auditLog: {
        create: vi.fn(),
        findMany,
      },
    });

    await expect(storage.query({ tenantId: "org_1", limit: 10 })).resolves.toEqual([
      {
        id: "audit_1",
        action: "org.role_change",
        actorId: "admin_1",
        actorType: "admin",
        tenantId: "org_1",
        targetType: "user",
        targetId: "user_2",
        metadata: { oldRole: "member", newRole: "admin" },
        ipAddress: "203.0.113.10",
        userAgent: "Vitest",
        timestamp: createdAt,
        outcome: "success",
      },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_1" },
        orderBy: { createdAt: "desc" },
        take: 10,
        skip: 0,
      }),
    );
  });
});
