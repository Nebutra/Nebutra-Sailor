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

// Mock Prisma (used directly by route.ts for communityProfile)
const mockPrisma = {
  communityProfile: { upsert: vi.fn().mockResolvedValue({}) },
};
vi.mock("@nebutra/db", () => ({ prisma: mockPrisma }));

// Mock @nebutra/license
const mockIssueLicense = vi.fn().mockResolvedValue({
  id: "lic_1",
  licenseKey: "NEBUTRA-TEST-KEY",
  tier: "OPC",
  type: "FREE",
  expiresAt: null,
});
vi.mock("@nebutra/license", () => ({
  issueLicense: (...args: unknown[]) => mockIssueLicense(...args),
  validateLicense: vi.fn(),
}));

describe("POST /api/license", () => {
  beforeEach((): void => {
    vi.clearAllMocks();
    mockIssueLicense.mockResolvedValue({
      id: "lic_1",
      licenseKey: "NEBUTRA-TEST-KEY",
      tier: "OPC",
      type: "FREE",
      expiresAt: null,
    });
  });

  it("calls issueLicense with correct params for free tier", async () => {
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
    expect(mockIssueLicense).toHaveBeenCalledOnce();

    const callArgs = mockIssueLicense.mock.calls[0]?.[0];
    expect(callArgs.userId).toBe("user_test_123");
    expect(callArgs.tier).toBe("OPC");
    expect(callArgs.displayName).toBe("Test Founder");
    expect(callArgs.lookingFor).toEqual(["early-users", "angel-investor"]);
  });

  it("returns license fields in response", async () => {
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

    expect(data.success).toBe(true);
    expect(data.license.licenseKey).toBe("NEBUTRA-TEST-KEY");
    expect(data.license.tier).toBe("OPC");
    expect(data.license.type).toBe("FREE");
  });
});
