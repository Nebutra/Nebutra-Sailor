import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    authSession: {
      deleteMany: vi.fn(),
    },
  },
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
const mockedDeleteMany = vi.mocked(db.authSession.deleteMany);

function buildAuth(overrides: Partial<Awaited<ReturnType<typeof getAuth>>> = {}) {
  return {
    userId: "user_1",
    orgId: "org_1",
    sessionClaims: { org_role: "org:admin" } as Record<string, unknown>,
    isSignedIn: true,
    ...overrides,
  } as Awaited<ReturnType<typeof getAuth>>;
}

async function loadRoute() {
  return import("@/app/api/auth/revoke-session/route");
}

function makeRequest(body: unknown): Request {
  return new Request("https://app.example/api/auth/revoke-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/revoke-session — audit", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockedDeleteMany.mockReset();
    auditLogMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not emit an audit event when unauthenticated", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false }));
    const { POST } = await loadRoute();
    const response = await POST(makeRequest({ sessionId: "sess_1" }));
    expect(response.status).toBe(401);
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("emits auth.session.revoked with severity warning on success", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedDeleteMany.mockResolvedValue({ count: 1 } as never);
    const { POST } = await loadRoute();
    const response = await POST(makeRequest({ sessionId: "sess_1" }));
    expect(response.status).toBe(200);
    expect(auditLogMock).toHaveBeenCalledTimes(1);
    expect(auditLogMock.mock.calls[0]?.[0]).toMatchObject({
      action: "auth.session.revoked",
      outcome: "success",
      severity: "warning",
      resource: { type: "session", id: "sess_1" },
    });
  });

  it("does not emit when the target session is not found", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedDeleteMany.mockResolvedValue({ count: 0 } as never);
    const { POST } = await loadRoute();
    const response = await POST(makeRequest({ sessionId: "sess_missing" }));
    expect(response.status).toBe(404);
    expect(auditLogMock).not.toHaveBeenCalled();
  });
});
