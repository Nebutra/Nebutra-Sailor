import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();

const dbMock = {
  organization: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

async function loadRoute() {
  return import("@/app/api/admin/organizations/route");
}

function buildRequest(url: string) {
  return new Request(url);
}

describe("GET /api/admin/organizations", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthMock.mockReset();
    dbMock.organization.findMany.mockReset();
    dbMock.organization.count.mockReset();
  });

  it("rejects unauthenticated requests with 401", async () => {
    getAuthMock.mockResolvedValue({
      userId: null,
      isSignedIn: false,
      sessionClaims: {},
    });

    const { GET } = await loadRoute();
    const response = await GET(buildRequest("http://localhost/api/admin/organizations"));

    expect(response.status).toBe(401);
    expect(dbMock.organization.findMany).not.toHaveBeenCalled();
  });

  it("rejects non-admin requests with 403", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_123",
      isSignedIn: true,
      sessionClaims: { org_role: "org:viewer" },
    });

    const { GET } = await loadRoute();
    const response = await GET(buildRequest("http://localhost/api/admin/organizations"));

    expect(response.status).toBe(403);
    expect(dbMock.organization.findMany).not.toHaveBeenCalled();
  });

  it("returns empty list when no organizations exist", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      isSignedIn: true,
      sessionClaims: { org_role: "org:admin" },
    });
    dbMock.organization.findMany.mockResolvedValue([]);
    dbMock.organization.count.mockResolvedValue(0);

    const { GET } = await loadRoute();
    const response = await GET(buildRequest("http://localhost/api/admin/organizations"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ organizations: [], total: 0, page: 1, pageSize: 20 });
  });

  it("returns paginated organizations with member count", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      isSignedIn: true,
      sessionClaims: { org_role: "org:admin" },
    });
    const fakeOrgs = [
      {
        id: "org_1",
        name: "Acme",
        slug: "acme",
        plan: "PRO",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        _count: { members: 12 },
      },
      {
        id: "org_2",
        name: "Beta",
        slug: "beta",
        plan: "FREE",
        createdAt: new Date("2026-02-01T00:00:00Z"),
        _count: { members: 3 },
      },
    ];
    dbMock.organization.findMany.mockResolvedValue(fakeOrgs);
    dbMock.organization.count.mockResolvedValue(2);

    const { GET } = await loadRoute();
    const response = await GET(
      buildRequest("http://localhost/api/admin/organizations?page=1&pageSize=20"),
    );

    expect(response.status).toBe(200);
    expect(dbMock.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
    const body = await response.json();
    expect(body.total).toBe(2);
    expect(body.organizations).toHaveLength(2);
    expect(body.organizations[0]).toMatchObject({
      id: "org_1",
      name: "Acme",
      slug: "acme",
      plan: "PRO",
      memberCount: 12,
    });
  });

  it("computes correct skip from page and pageSize", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      isSignedIn: true,
      sessionClaims: { org_role: "org:admin" },
    });
    dbMock.organization.findMany.mockResolvedValue([]);
    dbMock.organization.count.mockResolvedValue(0);

    const { GET } = await loadRoute();
    await GET(buildRequest("http://localhost/api/admin/organizations?page=3&pageSize=10"));

    expect(dbMock.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it("applies search filter on name (case-insensitive)", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      isSignedIn: true,
      sessionClaims: { org_role: "org:admin" },
    });
    dbMock.organization.findMany.mockResolvedValue([]);
    dbMock.organization.count.mockResolvedValue(0);

    const { GET } = await loadRoute();
    await GET(buildRequest("http://localhost/api/admin/organizations?search=acme"));

    expect(dbMock.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: expect.objectContaining({ contains: "acme", mode: "insensitive" }),
        }),
      }),
    );
  });
});
