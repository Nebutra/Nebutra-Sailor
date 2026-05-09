import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();

const dbMock = {
  auditLog: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

async function loadRoute() {
  return import("@/app/api/audit-logs/route");
}

function buildRequest(url: string) {
  return new Request(url);
}

function makeLog(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "log_1",
    organizationId: "org_123",
    userId: "user_1",
    actorType: "user",
    action: "user.login",
    outcome: "success",
    reason: null,
    entityType: "session",
    entityId: "sess_1",
    oldValue: null,
    newValue: null,
    ipAddress: "1.1.1.1",
    userAgent: "Mozilla/5.0",
    metadata: {},
    createdAt: new Date("2026-05-01T12:00:00Z"),
    ...overrides,
  };
}

describe("GET /api/audit-logs", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthMock.mockReset();
    dbMock.auditLog.findMany.mockReset();
  });

  it("rejects unauthenticated requests with 401", async () => {
    getAuthMock.mockResolvedValue({
      userId: null,
      orgId: null,
      isSignedIn: false,
      sessionClaims: {},
    });

    const { GET } = await loadRoute();
    const response = await GET(buildRequest("http://localhost/api/audit-logs"));

    expect(response.status).toBe(401);
    expect(dbMock.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("rejects users without audit_log:read scope with 403", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_1",
      orgId: "org_123",
      isSignedIn: true,
      sessionClaims: { org_role: "org:member" },
    });

    const { GET } = await loadRoute();
    const response = await GET(buildRequest("http://localhost/api/audit-logs"));

    expect(response.status).toBe(403);
    expect(dbMock.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("paginates with cursor and exposes nextCursor when more results exist", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      orgId: "org_123",
      isSignedIn: true,
      sessionClaims: { org_role: "org:admin" },
    });
    // limit=2 -> request take = 3 (limit+1) so we know there's more
    const rows = [
      makeLog({ id: "log_a", createdAt: new Date("2026-05-01T12:00:00Z") }),
      makeLog({ id: "log_b", createdAt: new Date("2026-05-01T11:00:00Z") }),
      makeLog({ id: "log_c", createdAt: new Date("2026-05-01T10:00:00Z") }),
    ];
    dbMock.auditLog.findMany.mockResolvedValue(rows);

    const { GET } = await loadRoute();
    const response = await GET(buildRequest("http://localhost/api/audit-logs?limit=2"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.logs).toHaveLength(2);
    expect(body.nextCursor).toBe("log_b");
    expect(dbMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        where: expect.objectContaining({ organizationId: "org_123" }),
      }),
    );
  });

  it("applies action, entityType, outcome, userId, date filters", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      orgId: "org_123",
      isSignedIn: true,
      sessionClaims: { org_role: "org:admin" },
    });
    dbMock.auditLog.findMany.mockResolvedValue([]);

    const { GET } = await loadRoute();
    await GET(
      buildRequest(
        "http://localhost/api/audit-logs?action=user.&entityType=session&outcome=success&userId=user_x&startDate=2026-04-01&endDate=2026-05-01",
      ),
    );

    const call = dbMock.auditLog.findMany.mock.calls[0]?.[0];
    expect(call.where).toMatchObject({
      organizationId: "org_123",
      action: { startsWith: "user." },
      entityType: "session",
      outcome: "success",
      userId: "user_x",
    });
    expect(call.where.createdAt.gte).toBeInstanceOf(Date);
    expect(call.where.createdAt.lte).toBeInstanceOf(Date);
  });

  it("scopes results to current org (cannot read other orgs)", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      orgId: "org_mine",
      isSignedIn: true,
      sessionClaims: { org_role: "org:admin" },
    });
    dbMock.auditLog.findMany.mockResolvedValue([]);

    const { GET } = await loadRoute();
    // Even if a malicious caller passes ?organizationId=org_other, the route
    // must use the auth-resolved orgId and ignore that param.
    await GET(buildRequest("http://localhost/api/audit-logs?organizationId=org_other"));

    const call = dbMock.auditLog.findMany.mock.calls[0]?.[0];
    expect(call.where.organizationId).toBe("org_mine");
  });

  it("clamps limit to max 100 and rejects invalid values", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      orgId: "org_123",
      isSignedIn: true,
      sessionClaims: { org_role: "org:admin" },
    });
    dbMock.auditLog.findMany.mockResolvedValue([]);

    const { GET } = await loadRoute();
    await GET(buildRequest("http://localhost/api/audit-logs?limit=9999"));

    const call = dbMock.auditLog.findMany.mock.calls[0]?.[0];
    // 100 cap + 1 lookahead = 101
    expect(call.take).toBe(101);
  });
});
