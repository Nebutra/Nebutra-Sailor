import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindFirst = vi.fn();

vi.mock("@nebutra/db", () => ({
  prisma: {
    license: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

describe("validateLicense", () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  it("returns valid=true for an active, non-expired license", async () => {
    mockFindFirst.mockResolvedValue({
      tier: "OPC",
      type: "FREE",
      expiresAt: null, // perpetual
    });

    const { validateLicense } = await import("../validate-license");
    const result = await validateLicense("valid-key-123");

    expect(result).toEqual({ valid: true, tier: "OPC", type: "FREE" });
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { licenseKey: "valid-key-123", isActive: true },
      select: { tier: true, type: true, expiresAt: true },
    });
  });

  it("returns valid=false with error for expired license", async () => {
    mockFindFirst.mockResolvedValue({
      tier: "STARTUP",
      type: "COMMERCIAL",
      expiresAt: new Date("2020-01-01"), // in the past
    });

    const { validateLicense } = await import("../validate-license");
    const result = await validateLicense("expired-key");

    expect(result).toEqual({ valid: false, error: "License has expired" });
  });

  it("returns valid=false for non-existent key", async () => {
    mockFindFirst.mockResolvedValue(null);

    const { validateLicense } = await import("../validate-license");
    const result = await validateLicense("nonexistent-key");

    expect(result).toEqual({ valid: false, error: "License key not found" });
  });

  it("returns valid=true for a license with future expiry date", async () => {
    mockFindFirst.mockResolvedValue({
      tier: "STARTUP",
      type: "COMMERCIAL",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    const { validateLicense } = await import("../validate-license");
    const result = await validateLicense("active-paid-key");

    expect(result).toEqual({ valid: true, tier: "STARTUP", type: "COMMERCIAL" });
  });
});
