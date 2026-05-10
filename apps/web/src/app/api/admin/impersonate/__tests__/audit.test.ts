import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn(() => true),
  resolveRole: vi.fn(() => "admin"),
}));

const auditLogMock = vi.fn(async (_input: Record<string, unknown>) => undefined);
vi.mock("@nebutra/audit", () => ({
  auditLogger: vi.fn(() => ({ log: auditLogMock })),
}));

vi.mock("@nebutra/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const mockedGetAuth = vi.mocked(getAuth);
const mockedFindUnique = vi.mocked(db.user.findUnique);

function buildAuth(overrides: Partial<Awaited<ReturnType<typeof getAuth>>> = {}) {
  return {
    userId: "admin_user",
    orgId: "org_admin",
    sessionClaims: { org_role: "org:admin" } as Record<string, unknown>,
    isSignedIn: true,
    ...overrides,
  } as Awaited<ReturnType<typeof getAuth>>;
}

async function loadRoute() {
  return import("@/app/api/admin/impersonate/route");
}

describe("POST /api/admin/impersonate — audit", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockedFindUnique.mockReset();
    auditLogMock.mockClear();
    process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits admin.impersonate.started with severity critical on success", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedFindUnique.mockResolvedValue({ id: "target_user" } as never);
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "target_user" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(auditLogMock).toHaveBeenCalledTimes(1);
    expect(auditLogMock.mock.calls[0]?.[0]).toMatchObject({
      action: "admin.impersonate.started",
      outcome: "success",
      severity: "critical",
      resource: { type: "user", id: "target_user" },
    });
  });

  it("does not emit on unauthenticated request", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false }));
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "target_user" }),
      }),
    );
    expect(response.status).toBe(401);
    expect(auditLogMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/impersonate — audit", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    auditLogMock.mockClear();
  });

  it("emits admin.impersonate.ended on success", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { DELETE } = await loadRoute();
    const response = await DELETE(
      new Request("https://app.example/api/admin/impersonate", { method: "DELETE" }),
    );
    expect(response.status).toBe(200);
    expect(auditLogMock).toHaveBeenCalledTimes(1);
    expect(auditLogMock.mock.calls[0]?.[0]).toMatchObject({
      action: "admin.impersonate.ended",
      outcome: "success",
      severity: "warning",
    });
  });
});
