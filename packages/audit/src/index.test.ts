import { beforeEach, describe, expect, it, vi } from "vitest";

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

const {
  audit,
  auditApiKeyCreate,
  auditBillingEvent,
  auditDataExport,
  auditRoleChange,
  auditUserLogin,
  auditUserLogout,
  createPrismaStorage,
  inMemoryStorage,
  queryAuditLogs,
  setAuditStorage,
} = await import("./index.js");

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

describe("in-memory audit storage", () => {
  beforeEach(() => {
    // Reset to in-memory storage for isolation
    setAuditStorage(inMemoryStorage);
  });

  it("stores and retrieves audit events", async () => {
    await audit({
      action: "user.login",
      actorId: "user_1",
      actorType: "user",
      tenantId: "org_1",
      outcome: "success",
    });

    const logs = await queryAuditLogs({ tenantId: "org_1" });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const event = logs.find((e) => e.actorId === "user_1");
    expect(event?.action).toBe("user.login");
    expect(event?.outcome).toBe("success");
  });

  it("assigns id and timestamp automatically", async () => {
    await audit({
      action: "org.create",
      actorId: "user_1",
      actorType: "user",
      outcome: "success",
    });

    const logs = await queryAuditLogs({ actorId: "user_1", action: "org.create" });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0]?.id).toBeDefined();
    expect(logs[0]?.timestamp).toBeInstanceOf(Date);
  });

  it("filters by action", async () => {
    await audit({ action: "user.login", actorId: "u1", actorType: "user", outcome: "success" });
    await audit({ action: "user.logout", actorId: "u1", actorType: "user", outcome: "success" });

    const logins = await queryAuditLogs({ action: "user.login", actorId: "u1" });
    const logouts = await queryAuditLogs({ action: "user.logout", actorId: "u1" });
    expect(logins.every((e) => e.action === "user.login")).toBe(true);
    expect(logouts.every((e) => e.action === "user.logout")).toBe(true);
  });
});

describe("convenience functions", () => {
  beforeEach(() => {
    setAuditStorage(inMemoryStorage);
  });

  it("auditUserLogin records login events", async () => {
    await auditUserLogin("user_1", "org_1", true, "1.2.3.4", "TestAgent");
    const logs = await queryAuditLogs({ actorId: "user_1", action: "user.login" });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const event = logs[0];
    expect(event?.outcome).toBe("success");
    expect(event?.ipAddress).toBe("1.2.3.4");
  });

  it("auditUserLogin records failures", async () => {
    await auditUserLogin("user_1", "org_1", false);
    const logs = await queryAuditLogs({ actorId: "user_1", action: "user.login" });
    const failEvent = logs.find((e) => e.outcome === "failure");
    expect(failEvent).toBeDefined();
  });

  it("auditUserLogout records logout events", async () => {
    await auditUserLogout("user_1", "org_1");
    const logs = await queryAuditLogs({ actorId: "user_1", action: "user.logout" });
    expect(logs.length).toBeGreaterThanOrEqual(1);
  });

  it("auditRoleChange records role changes with metadata", async () => {
    await auditRoleChange("admin_1", "org_1", "user_2", "member", "admin");
    const logs = await queryAuditLogs({ action: "org.role_change" });
    const event = logs.find((e) => e.targetId === "user_2");
    expect(event?.metadata).toEqual({ oldRole: "member", newRole: "admin" });
  });

  it("auditBillingEvent records billing events", async () => {
    await auditBillingEvent("org_1", "billing.payment_success", { amount: 99.99 });
    const logs = await queryAuditLogs({ action: "billing.payment_success" });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0]?.actorType).toBe("system");
  });

  it("auditBillingEvent marks failures correctly", async () => {
    await auditBillingEvent("org_1", "billing.payment_failed", { reason: "card_declined" });
    const logs = await queryAuditLogs({ action: "billing.payment_failed" });
    const event = logs.find((e) => e.outcome === "failure");
    expect(event).toBeDefined();
  });

  it("auditApiKeyCreate records API key creation", async () => {
    await auditApiKeyCreate("user_1", "org_1", "key_1", "Production Key");
    const logs = await queryAuditLogs({ action: "api.key_create" });
    const event = logs.find((e) => e.targetId === "key_1");
    expect(event?.metadata).toEqual({ keyName: "Production Key" });
  });

  it("auditDataExport records data exports", async () => {
    await auditDataExport("user_1", "org_1", "account_data", { format: "json" });
    const logs = await queryAuditLogs({ action: "data.export" });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const event = logs.find((e) => e.actorId === "user_1" && e.action === "data.export");
    expect(event?.metadata?.exportType).toBe("account_data");
  });
});
