import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server", () => ({
  createAuth: vi.fn(),
}));

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/test", { headers });
}

function buildAuth(getSessionImpl: (req: Request) => unknown) {
  return {
    provider: "better-auth" as const,
    getSession: vi.fn(getSessionImpl),
    getUser: vi.fn(),
    createUser: vi.fn(),
    getOrganization: vi.fn(),
    getUserOrganizations: vi.fn(),
    createOrganization: vi.fn(),
    middleware: vi.fn(),
    handleWebhook: vi.fn(),
  };
}

async function loadFresh() {
  vi.resetModules();
  const server = await import("../server");
  const { getAuditableContext } = await import("../audit-context");
  return { mockedCreateAuth: vi.mocked(server.createAuth), getAuditableContext };
}

describe("getAuditableContext", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for unauthenticated requests", async () => {
    const { mockedCreateAuth, getAuditableContext } = await loadFresh();
    mockedCreateAuth.mockResolvedValue(buildAuth(() => null) as never);
    const ctx = await getAuditableContext(makeRequest());
    expect(ctx).toBeNull();
  });

  it("returns actor + org tenant when a session has an organizationId", async () => {
    const { mockedCreateAuth, getAuditableContext } = await loadFresh();
    mockedCreateAuth.mockResolvedValue(
      buildAuth(() => ({
        userId: "user_1",
        organizationId: "org_1",
        email: "alice@example.com",
        expiresAt: new Date(Date.now() + 60_000),
      })) as never,
    );
    const ctx = await getAuditableContext(makeRequest());
    expect(ctx).toEqual({
      actor: { id: "user_1", type: "user", email: "alice@example.com" },
      tenantId: "org_1",
    });
  });

  it("falls back to userId as tenantId for account-scoped sessions", async () => {
    const { mockedCreateAuth, getAuditableContext } = await loadFresh();
    mockedCreateAuth.mockResolvedValue(
      buildAuth(() => ({
        userId: "user_42",
        expiresAt: new Date(Date.now() + 60_000),
      })) as never,
    );
    const ctx = await getAuditableContext(makeRequest());
    expect(ctx).toEqual({
      actor: { id: "user_42", type: "user" },
      tenantId: "user_42",
    });
  });

  it("recognises api_key actor headers and skips session lookup", async () => {
    const { mockedCreateAuth, getAuditableContext } = await loadFresh();
    const auth = buildAuth(() => null);
    mockedCreateAuth.mockResolvedValue(auth as never);
    const ctx = await getAuditableContext(
      makeRequest({
        "x-actor-type": "api_key",
        "x-actor-id": "key_abc",
        "x-actor-tenant": "org_99",
      }),
    );
    expect(ctx).toEqual({
      actor: { id: "key_abc", type: "api_key" },
      tenantId: "org_99",
    });
    expect(auth.getSession).not.toHaveBeenCalled();
  });

  it("returns null when session lookup throws", async () => {
    const { mockedCreateAuth, getAuditableContext } = await loadFresh();
    mockedCreateAuth.mockResolvedValue(
      buildAuth(() => {
        throw new Error("kaboom");
      }) as never,
    );
    const ctx = await getAuditableContext(makeRequest());
    expect(ctx).toBeNull();
  });
});
