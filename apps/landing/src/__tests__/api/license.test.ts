import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreatePaymentOrder = vi.hoisted(() => vi.fn());
const mockCardAvailable = vi.hoisted(() => vi.fn());
const mockEnsurePersonalTenant = vi.hoisted(() => vi.fn());

// Mock @nebutra/auth via the landing helper
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
  configureLicenseSystemDb: vi.fn(),
}));

// Mock @nebutra/billing — the paid tier places a Creem card order
vi.mock("@nebutra/billing", () => ({
  createPaymentOrder: (...args: unknown[]) => mockCreatePaymentOrder(...args),
  isPaymentMethodAvailable: (...args: unknown[]) => mockCardAvailable(...args),
  configureOffers: vi.fn(),
  configurePaymentOrderStore: vi.fn(),
}));

vi.mock("@nebutra/repositories", () => ({
  PaymentOrderRepository: class {},
  PersonalTenantRepository: class {
    ensure(...args: unknown[]) {
      return mockEnsurePersonalTenant(...args);
    }
  },
}));

describe("POST /api/license", () => {
  beforeEach((): void => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    mockCreatePaymentOrder.mockResolvedValue({
      orderId: "ord_startup_123",
      session: { kind: "redirect", url: "https://checkout.creem.test/ch_123", provider: "creem" },
      amountMinor: 200_000,
      currency: "USD",
    });
    mockCardAvailable.mockReturnValue(true);
    mockEnsurePersonalTenant.mockResolvedValue("tenant_personal_123");
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

  it("returns a Creem checkout redirect for STARTUP without issuing the license early", async () => {
    const { POST } = await import("../../app/api/license/route");

    const req = new Request("https://nebutra.com/api/license", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "https://nebutra.com",
      },
      body: JSON.stringify({
        role: "developer",
        teamSize: "2-5",
        useCase: "saas",
        tier: "STARTUP",
        referralSource: "github",
        lookingFor: ["early-users"],
        githubHandle: "nebutra-builder",
        acceptedTerms: true,
      }),
    });

    // biome-ignore lint/suspicious/noExplicitAny: NextRequest mirrors Request at runtime
    const res = await POST(req as any);
    const data = await res.json();

    expect(data).toEqual({
      success: true,
      requireCheckout: true,
      url: "https://checkout.creem.test/ch_123",
      orderId: "ord_startup_123",
    });
    expect(mockIssueLicense).not.toHaveBeenCalled();
    expect(mockEnsurePersonalTenant).toHaveBeenCalledWith({
      userId: "user_test_123",
      email: "test@example.com",
    });
    expect(mockCreatePaymentOrder).toHaveBeenCalledWith({
      offerId: "license_team_annual",
      organizationId: "tenant_personal_123",
      method: "card",
      successUrl: "https://nebutra.com/en/get-license?success=true",
      cancelUrl: "https://nebutra.com/en/get-license?cancel=true",
      customerEmail: "test@example.com",
    });
  });

  it("answers 503 for STARTUP when card checkout is not configured", async () => {
    mockCardAvailable.mockReturnValue(false);
    const { POST } = await import("../../app/api/license/route");

    const req = new Request("https://nebutra.com/api/license", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "https://nebutra.com" },
      body: JSON.stringify({
        role: "developer",
        teamSize: "2-5",
        useCase: "saas",
        tier: "STARTUP",
        lookingFor: [],
        acceptedTerms: true,
      }),
    });

    // biome-ignore lint/suspicious/noExplicitAny: NextRequest mirrors Request at runtime
    const res = await POST(req as any);
    expect(res.status).toBe(503);
    expect(mockCreatePaymentOrder).not.toHaveBeenCalled();
  });
});
