import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @nebutra/auth via the landing-page helper
vi.mock("@/lib/auth", () => ({
  getSessionFromRequest: vi.fn().mockResolvedValue({
    userId: "user_test_123",
    email: "test@example.com",
    expiresAt: new Date(Date.now() + 3_600_000),
  }),
  getUserById: vi.fn().mockResolvedValue({
    id: "user_test_123",
    email: "test@example.com",
    name: "Test Founder",
    imageUrl: "https://example.com/avatar.jpg",
    createdAt: new Date(),
  }),
}));

// Mock Prisma — route.ts calls getSystemDb() at module load
const mockPrisma = {
  communityProfile: { upsert: vi.fn().mockResolvedValue({}) },
  license: { findFirst: vi.fn().mockResolvedValue(null) },
  sleptonsaMemberProfile: { findUnique: vi.fn().mockResolvedValue(null) },
};
vi.mock("@nebutra/db", () => ({
  getSystemDb: () => mockPrisma,
  getTenantDb: () => mockPrisma,
}));

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

// Mock @nebutra/billing — not exercised by free-tier tests, but imported at load
vi.mock("@nebutra/billing", () => ({
  createCheckoutSession: vi.fn(),
  getOrCreateCustomer: vi.fn(),
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
    // biome-ignore lint/suspicious/noExplicitAny: NextRequest mirrors Request at runtime
    const res = await POST(req as any);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(mockIssueLicense).toHaveBeenCalledOnce();

    const callArgs = mockIssueLicense.mock.calls[0]?.[0];
    expect(callArgs.userId).toBe("user_test_123");
    expect(callArgs.tier).toBe("OPC");
    expect(callArgs.displayName).toBe("Test Founder");
    expect(callArgs.email).toBe("test@example.com");
    expect(callArgs.avatarUrl).toBe("https://example.com/avatar.jpg");
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
    // biome-ignore lint/suspicious/noExplicitAny: NextRequest mirrors Request at runtime
    const res = await POST(req as any);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.license.licenseKey).toBe("NEBUTRA-TEST-KEY");
    expect(data.license.tier).toBe("OPC");
    expect(data.license.type).toBe("FREE");
  });
});
