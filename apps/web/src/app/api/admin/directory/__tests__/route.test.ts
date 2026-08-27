import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();
const userCountMock = vi.fn();
const userFindManyMock = vi.fn();
const organizationCountMock = vi.fn();
const organizationFindManyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    organization: {
      count: organizationCountMock,
      findMany: organizationFindManyMock,
    },
    user: {
      count: userCountMock,
      findMany: userFindManyMock,
    },
  },
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn() },
}));

async function loadRoute() {
  return import("../route");
}

describe("GET /api/admin/directory", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    userCountMock.mockReset();
    userFindManyMock.mockReset();
    organizationCountMock.mockReset();
    organizationFindManyMock.mockReset();
  });

  it("requires an authenticated admin with admin access", async () => {
    getAuthMock.mockResolvedValue({ isSignedIn: false, userId: null, sessionClaims: {} });
    const { GET } = await loadRoute();

    const response = await GET(new Request("https://app.example/api/admin/directory"));

    expect(response.status).toBe(401);
    expect(userFindManyMock).not.toHaveBeenCalled();
    expect(organizationFindManyMock).not.toHaveBeenCalled();
  });

  it("searches and paginates users and organizations with URL query state", async () => {
    getAuthMock.mockResolvedValue({
      isSignedIn: true,
      userId: "admin_1",
      sessionClaims: { org_role: "org:admin" },
    });
    userCountMock.mockResolvedValue(11);
    organizationCountMock.mockResolvedValue(3);
    userFindManyMock.mockResolvedValue([
      {
        id: "user_1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        organizations: [{ organization: { name: "Analytical Engines" } }],
      },
    ]);
    organizationFindManyMock.mockResolvedValue([
      {
        id: "org_1",
        name: "Analytical Engines",
        slug: "analytical-engines",
        plan: "PRO",
      },
    ]);
    const { GET } = await loadRoute();

    const response = await GET(
      new Request("https://app.example/api/admin/directory?q=ada&page=2&pageSize=5"),
    );

    expect(response.status).toBe(200);
    expect(userFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        where: {
          OR: [
            { name: { contains: "ada", mode: "insensitive" } },
            { email: { contains: "ada", mode: "insensitive" } },
            {
              organizations: {
                some: {
                  organization: { name: { contains: "ada", mode: "insensitive" } },
                },
              },
            },
          ],
        },
      }),
    );
    expect(organizationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        where: {
          OR: [
            { name: { contains: "ada", mode: "insensitive" } },
            { slug: { contains: "ada", mode: "insensitive" } },
          ],
        },
      }),
    );
    await expect(response.json()).resolves.toEqual({
      organizations: [
        {
          id: "org_1",
          name: "Analytical Engines",
          planName: "PRO",
          slug: "analytical-engines",
        },
      ],
      page: 2,
      pageSize: 5,
      query: "ada",
      totalOrganizations: 3,
      totalUsers: 11,
      users: [
        {
          email: "ada@example.com",
          emailVerified: null,
          id: "user_1",
          name: "Ada Lovelace",
          organizationName: "Analytical Engines",
        },
      ],
    });
  });
});
