import { beforeEach, describe, expect, it, vi } from "vitest";

const clerkAuthMock = vi.fn();
const clerkClientMock = vi.fn();
const createAuthMock = vi.fn();
const cookiesMock = vi.fn();
const headersMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: clerkAuthMock,
  clerkClient: clerkClientMock,
}));

vi.mock("@nebutra/auth/server", () => ({
  createAuth: createAuthMock,
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
  headers: headersMock,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

async function loadAuth() {
  return import("@/lib/auth");
}

describe("Clerk active organization auth", () => {
  beforeEach(() => {
    vi.resetModules();
    clerkAuthMock.mockReset();
    clerkClientMock.mockReset();
    createAuthMock.mockReset();
    cookiesMock.mockReset();
    headersMock.mockReset();
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "clerk";
    delete process.env.AUTH_PROVIDER;
  });

  it("resolves the active organization cookie through Clerk memberships for requireOrg", async () => {
    clerkAuthMock.mockResolvedValue({
      userId: "user_alpha",
      orgId: null,
      orgRole: "org:admin",
      sessionClaims: { org_plan: "PRO" },
    });
    clerkClientMock.mockResolvedValue({
      users: {
        getOrganizationMembershipList: vi.fn().mockResolvedValue({
          data: [
            {
              organization: {
                id: "org_alpha",
                name: "Acme Labs",
                slug: "acme-labs",
              },
            },
          ],
        }),
      },
    });
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "org_alpha" }),
    });

    const { getAuth } = await loadAuth();

    await expect(getAuth()).resolves.toMatchObject({
      userId: "user_alpha",
      orgId: "org_alpha",
      isSignedIn: true,
      sessionClaims: { org_plan: "PRO", org_role: "org:admin" },
    });
    expect(createAuthMock).not.toHaveBeenCalled();
  });
});
