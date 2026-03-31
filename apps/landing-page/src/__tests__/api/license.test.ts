import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_test_123" }),
  clerkClient: vi.fn().mockReturnValue({
    users: {
      getUser: vi.fn().mockResolvedValue({
        fullName: "Test Founder",
        username: "testfounder",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        imageUrl: "https://example.com/avatar.jpg",
      }),
    },
  }),
}));

// Mock Prisma
const mockPrisma = {
  communityProfile: { upsert: vi.fn().mockResolvedValue({}) },
  license: {
    create: vi.fn().mockResolvedValue({
      id: "lic_1",
      licenseKey: "NEBUTRA-TEST-KEY",
      tier: "OPC",
      type: "FREE",
      expiresAt: null,
    }),
  },
  sleptonsaMemberProfile: {
    create: vi.fn().mockResolvedValue({
      id: "smp_1",
      member_number: 42,
      slug: "test-founder-42",
    }),
    update: vi.fn().mockResolvedValue({
      id: "smp_1",
      member_number: 42,
      slug: "test-founder-42",
    }),
  },
};

vi.mock("@nebutra/db", () => ({ prisma: mockPrisma }));

describe("POST /api/license", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a sleptons_member_profile after license creation", async () => {
    const { POST } = await import("../../app/api/license/route");

    const req = new Request("http://localhost/api/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "solo_developer",
        teamSize: "1",
        useCase: "saas",
        tier: "OPC",
        referralSource: "twitter",
        lookingFor: ["early-users", "angel-investor"],
        acceptedTerms: true,
      }),
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(mockPrisma.sleptonsaMemberProfile.create).toHaveBeenCalledOnce();

    const createCall = mockPrisma.sleptonsaMemberProfile.create.mock.calls[0][0];
    expect(createCall.data.looking_for).toEqual(["early-users", "angel-investor"]);
    expect(createCall.data.license_id).toBe("lic_1");
  });

  it("returns communityMemberNumber in response", async () => {
    const { POST } = await import("../../app/api/license/route");

    const req = new Request("http://localhost/api/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "founder",
        teamSize: "1",
        useCase: "ai_tool",
        tier: "INDIVIDUAL",
        referralSource: "github",
        lookingFor: [],
        acceptedTerms: true,
      }),
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(data.community?.memberNumber).toBe(42);
    expect(data.community?.slug).toBe("test-founder-42");
  });
});
