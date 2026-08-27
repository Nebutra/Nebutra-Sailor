import { describe, expect, it, vi } from "vitest";
import { MemoryAuditProvider } from "../providers/memory";
import { PostgresAuditProvider } from "../providers/postgres";
import type { AuditEvent } from "../schema";

const NOW = "2026-05-10T12:00:00.000Z";

function makeEvent(partial: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: partial.id ?? "550e8400-e29b-41d4-a716-446655440001",
    timestamp: partial.timestamp ?? NOW,
    actor: partial.actor ?? { id: "user_1", type: "user" },
    tenantId: partial.tenantId ?? "org_1",
    action: partial.action ?? "auth.login.success",
    resource: partial.resource ?? { type: "session", id: "sess_1" },
    outcome: partial.outcome ?? "success",
    severity: partial.severity ?? "info",
    context: partial.context ?? {},
    ...(partial.changes ? { changes: partial.changes } : {}),
    ...(partial.metadata ? { metadata: partial.metadata } : {}),
  };
}

describe("MemoryAuditProvider", () => {
  it("appends events and queries by tenantId", async () => {
    const provider = new MemoryAuditProvider();
    await provider.log(makeEvent({ tenantId: "org_a" }));
    await provider.log(
      makeEvent({ id: "550e8400-e29b-41d4-a716-446655440002", tenantId: "org_b" }),
    );
    const results = await provider.query({ tenantId: "org_a" });
    expect(results).toHaveLength(1);
    expect(results[0]?.tenantId).toBe("org_a");
  });

  it("filters by outcome and action", async () => {
    const provider = new MemoryAuditProvider();
    await provider.log(makeEvent({ outcome: "success", action: "auth.login.success" }));
    await provider.log(
      makeEvent({
        id: "550e8400-e29b-41d4-a716-446655440003",
        outcome: "failure",
        action: "auth.login.failure",
      }),
    );
    const failures = await provider.query({ outcome: "failure" });
    expect(failures).toHaveLength(1);
    expect(failures[0]?.action).toBe("auth.login.failure");
  });

  it("returns events in descending timestamp order", async () => {
    const provider = new MemoryAuditProvider();
    await provider.log(
      makeEvent({
        id: "550e8400-e29b-41d4-a716-446655440010",
        timestamp: "2026-01-01T00:00:00.000Z",
      }),
    );
    await provider.log(
      makeEvent({
        id: "550e8400-e29b-41d4-a716-446655440011",
        timestamp: "2026-03-01T00:00:00.000Z",
      }),
    );
    await provider.log(
      makeEvent({
        id: "550e8400-e29b-41d4-a716-446655440012",
        timestamp: "2026-02-01T00:00:00.000Z",
      }),
    );
    const results = await provider.query({});
    expect(results.map((e) => e.id)).toEqual([
      "550e8400-e29b-41d4-a716-446655440011",
      "550e8400-e29b-41d4-a716-446655440012",
      "550e8400-e29b-41d4-a716-446655440010",
    ]);
  });

  it("never overwrites or removes existing events (append-only)", async () => {
    const provider = new MemoryAuditProvider();
    await provider.log(makeEvent());
    await provider.log(makeEvent({ id: "550e8400-e29b-41d4-a716-446655440099" }));
    expect(provider.__all()).toHaveLength(2);
  });
});

describe("PostgresAuditProvider", () => {
  it("inserts events with the correct field mapping", async () => {
    const create = vi.fn().mockResolvedValue({});
    const provider = new PostgresAuditProvider({
      auditLog: { create, findMany: vi.fn() },
    });

    const event = makeEvent({
      action: "org.member.role_changed",
      resource: { type: "user", id: "user_2", name: "Bob" },
      changes: { before: { role: "member" }, after: { role: "admin" } },
      context: { ip: "203.0.113.10", userAgent: "Vitest" },
      metadata: { source: "ui" },
    });

    await provider.log(event);

    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data.id).toBe(event.id);
    expect(data.organizationId).toBe(event.tenantId);
    expect(data.userId).toBe(event.actor.id);
    expect(data.actorType).toBe("user");
    expect(data.action).toBe(event.action);
    expect(data.entityType).toBe("user");
    expect(data.entityId).toBe("user_2");
    expect(data.outcome).toBe("success");
    expect(data.ipAddress).toBe("203.0.113.10");
    expect(data.userAgent).toBe("Vitest");
    expect(data.oldValue).toEqual({ role: "member" });
    expect(data.newValue).toEqual({ role: "admin" });
    const meta = data.metadata as Record<string, unknown>;
    expect(meta.severity).toBe("info");
    expect(meta.resourceName).toBe("Bob");
    expect(meta.userMetadata).toEqual({ source: "ui" });
  });

  it("queries with tenantId + outcome filters", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "row_1",
        organizationId: "org_1",
        userId: "user_1",
        actorType: "user",
        action: "auth.login.success",
        outcome: "success",
        reason: null,
        entityType: "session",
        entityId: "sess_1",
        oldValue: null,
        newValue: null,
        ipAddress: null,
        userAgent: null,
        metadata: { severity: "info" },
        createdAt: new Date("2026-05-10T12:00:00.000Z"),
      },
    ]);
    const provider = new PostgresAuditProvider({
      auditLog: { create: vi.fn(), findMany },
    });
    const events = await provider.query({ tenantId: "org_1", outcome: "success" });
    expect(events).toHaveLength(1);
    expect(events[0]?.tenantId).toBe("org_1");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org_1", outcome: "success" }),
      }),
    );
  });
});
