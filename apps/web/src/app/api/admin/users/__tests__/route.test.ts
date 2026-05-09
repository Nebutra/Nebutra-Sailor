import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();

const dbMock = {
  user: {
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
  return import("@/app/api/admin/users/route");
}

function buildRequest(url: string) {
  return new Request(url);
}

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthMock.mockReset();
    dbMock.user.findMany.mockReset();
    dbMock.user.count.mockReset();
  });

  it("rejects unauthenticated requests with 401", async () => {
    getAuthMock.mockResolvedValue({
      userId: null,
      isSignedIn: false,
      sessionClaims: {},
    });

    const { GET } = await loadRoute();
    const response = await GET(buildRequest("http://localhost/api/admin/users"));

    expect(response.status).toBe(401);
    expect(dbMock.user.findMany).not.toHaveBeenCalled();
  });

  it("rejects non-admin authenticated users with 403", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_123",
      isSignedIn: true,
      sessionClaims: { org_role: "org:member" },
    });

    const { GET } = await loadRoute();
    const response = await GET(buildRequest("http://localhost/api/admin/users"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
    expect(dbMock.user.findMany).not.toHaveBeenCalled();
  });

  it("returns empty list when no users exist", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      isSignedIn: true,
      sessionClaims: { org_role: "org:admin" },
    });
    dbMock.user.findMany.mockResolvedValue([]);
    dbMock.user.count.mockResolvedValue(0);

    const { GET } = await loadRoute();
    const response = await GET(buildRequest("http://localhost/api/admin/users"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ users: [], total: 0, page: 1, pageSize: 20 });
  });

  it("returns paginated users with correct skip/take", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      isSignedIn: true,
      sessionClaims: { org_role: "org:admin" },
    });
    const fakeUsers = Array.from({ length: 20 }).map((_, i) => ({
      id: `u_${i}`,
      email: `user${i}@x.com`,
      name: `User ${i}`,
      avatarUrl: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      _count: { organizations: 1 },
    }));
    dbMock.user.findMany.mockResolvedValue(fakeUsers);
    dbMock.user.count.mockResolvedValue(45);

    const { GET } = await loadRoute();
    const response = await GET(buildRequest("http://localhost/api/admin/users?page=2&pageSize=20"));

    expect(response.status).toBe(200);
    expect(dbMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
    const body = await response.json();
    expect(body.total).toBe(45);
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(20);
    expect(body.users).toHaveLength(20);
    expect(body.users[0]).toMatchObject({
      id: "u_0",
      email: "user0@x.com",
      activeOrgsCount: 1,
    });
  });

  it("applies search filter on email and name (case-insensitive)", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      isSignedIn: true,
      sessionClaims: { org_role: "org:admin" },
    });
    dbMock.user.findMany.mockResolvedValue([]);
    dbMock.user.count.mockResolvedValue(0);

    const { GET } = await loadRoute();
    await GET(buildRequest("http://localhost/api/admin/users?search=Acme"));

    expect(dbMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              email: expect.objectContaining({ contains: "Acme", mode: "insensitive" }),
            }),
            expect.objectContaining({
              name: expect.objectContaining({ contains: "Acme", mode: "insensitive" }),
            }),
          ]),
        }),
      }),
    );
  });

  it("clamps invalid pagination params to safe defaults", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      isSignedIn: true,
      sessionClaims: { org_role: "org:admin" },
    });
    dbMock.user.findMany.mockResolvedValue([]);
    dbMock.user.count.mockResolvedValue(0);

    const { GET } = await loadRoute();
    const response = await GET(
      buildRequest("http://localhost/api/admin/users?page=-5&pageSize=9999"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.page).toBe(1);
    expect(body.pageSize).toBeLessThanOrEqual(100);
  });
});
