import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
    organizationMember: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
    organizationInvitation: { findMany: vi.fn() },
  },
}));

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const mockedGetAuth = vi.mocked(getAuth);
const mockedFindUnique = vi.mocked(db.user.findUnique);
const mockedMembers = vi.mocked(db.organizationMember.findMany);
const mockedAudit = vi.mocked(db.auditLog.findMany);
const mockedInvitations = vi.mocked(db.organizationInvitation.findMany);

async function loadRoute() {
  return import("@/app/api/account/export/route");
}

function buildAuth(overrides: Partial<Awaited<ReturnType<typeof getAuth>>> = {}) {
  return {
    userId: "user_1",
    orgId: "org_1",
    sessionClaims: {} as Record<string, unknown>,
    isSignedIn: true,
    ...overrides,
  } as Awaited<ReturnType<typeof getAuth>>;
}

function defaultDbReturns() {
  mockedFindUnique.mockResolvedValue({
    id: "user_1",
    email: "alice@example.com",
    name: "Alice",
  } as never);
  mockedMembers.mockResolvedValue([] as never);
  mockedAudit.mockResolvedValue([] as never);
  mockedInvitations.mockResolvedValue([] as never);
}

describe("/api/account/export", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockedFindUnique.mockReset();
    mockedMembers.mockReset();
    mockedAudit.mockReset();
    mockedInvitations.mockReset();
    const mod = await loadRoute();
    mod.__resetExportStoreForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when there is no session (POST)", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false }));
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/export", { method: "POST" }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 202 with exportId for an authenticated user", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    defaultDbReturns();
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/export", { method: "POST" }),
    );
    expect(response.status).toBe(202);
    const body = (await response.json()) as {
      exportId: string;
      status: string;
      estimatedReadyAt: string;
      inline: boolean;
    };
    expect(body.exportId).toMatch(/[0-9a-f-]{36}/);
    expect(body.status).toBe("pending");
    expect(typeof body.estimatedReadyAt).toBe("string");
    expect(body.inline).toBe(true);
  });

  it("GET returns 404 when the export does not belong to the caller", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    defaultDbReturns();
    const { POST, GET } = await loadRoute();

    // Create an export as user_1
    await POST(new Request("https://app.example/api/account/export", { method: "POST" }));

    // Switch session to user_2
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: "user_2" }));
    const response = await GET(
      new Request("https://app.example/api/account/export?id=does-not-exist"),
    );
    expect(response.status).toBe(404);
  });

  it("GET returns the inline payload when ready", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    defaultDbReturns();
    const { POST, GET } = await loadRoute();
    const created = await POST(
      new Request("https://app.example/api/account/export", { method: "POST" }),
    );
    const { exportId } = (await created.json()) as { exportId: string };

    const response = await GET(
      new Request(`https://app.example/api/account/export?id=${exportId}`),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      data?: { user: unknown; organizations: unknown[]; auditEvents: unknown[] };
      inline: boolean;
    };
    expect(body.status).toBe("ready");
    expect(body.inline).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data?.user).toBeTruthy();
    expect(Array.isArray(body.data?.organizations)).toBe(true);
    expect(Array.isArray(body.data?.auditEvents)).toBe(true);
  });

  it("GET returns 401 when unauthenticated", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false }));
    const { GET } = await loadRoute();
    const response = await GET(new Request("https://app.example/api/account/export?id=abc"));
    expect(response.status).toBe(401);
  });

  it("GET returns 400 when id query param is missing", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { GET } = await loadRoute();
    const response = await GET(new Request("https://app.example/api/account/export"));
    expect(response.status).toBe(400);
  });
});
