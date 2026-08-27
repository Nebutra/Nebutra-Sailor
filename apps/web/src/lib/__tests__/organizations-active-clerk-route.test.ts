import { beforeEach, describe, expect, it, vi } from "vitest";

const clerkAuthMock = vi.fn();
const clerkClientMock = vi.fn();
const createAuthMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: clerkAuthMock,
  clerkClient: clerkClientMock,
}));

vi.mock("@nebutra/auth/server", () => ({
  createAuth: createAuthMock,
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

async function loadRoute() {
  return import("@/app/api/organizations/active/route");
}

describe("POST /api/organizations/active with Clerk", () => {
  beforeEach(() => {
    vi.resetModules();
    clerkAuthMock.mockReset();
    clerkClientMock.mockReset();
    createAuthMock.mockReset();
    loggerErrorMock.mockReset();
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "clerk";
    delete process.env.AUTH_PROVIDER;
  });

  it("sets the active organization cookie after validating Clerk membership", async () => {
    const getMembershipsMock = vi.fn().mockResolvedValue({
      data: [
        {
          organization: {
            id: "org_alpha",
            name: "Acme Labs",
            slug: "acme-labs",
            imageUrl: "https://img.example/acme.png",
          },
        },
      ],
    });
    clerkAuthMock.mockResolvedValue({ userId: "user_alpha" });
    clerkClientMock.mockResolvedValue({
      users: {
        getOrganizationMembershipList: getMembershipsMock,
      },
    });

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/active", {
        method: "POST",
        body: JSON.stringify({ organizationId: "org_alpha" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(createAuthMock).not.toHaveBeenCalled();
    expect(getMembershipsMock).toHaveBeenCalledWith({ userId: "user_alpha" });
    await expect(response.json()).resolves.toEqual({
      organizationId: "org_alpha",
      name: "Acme Labs",
      slug: "acme-labs",
    });
    expect(response.headers.get("set-cookie")).toContain("nebutra_active_org=org_alpha");
  });
});
