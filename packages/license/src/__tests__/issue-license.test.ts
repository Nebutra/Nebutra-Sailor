import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IssueLicenseParams } from "../types.js";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockLicenseCreate = vi.fn();
const mockLicenseFindFirst = vi.fn();

vi.mock("@nebutra/db", () => ({
  prisma: {
    license: {
      create: (...args: unknown[]) => mockLicenseCreate(...args),
      findFirst: (...args: unknown[]) => mockLicenseFindFirst(...args),
    },
  },
}));

const mockEnqueue = vi
  .fn()
  .mockResolvedValue({ jobId: "job_1", accepted: true, provider: "memory" });

vi.mock("@nebutra/queue", () => ({
  getQueue: vi.fn().mockResolvedValue({
    enqueue: (...args: unknown[]) => mockEnqueue(...args),
  }),
  createJob: vi.fn((queue: string, type: string, data: Record<string, unknown>) => ({
    id: `${queue}-${type}-${Date.now()}`,
    queue,
    type,
    data,
    createdAt: new Date().toISOString(),
  })),
}));

vi.mock("@nebutra/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) },
}));

// ── Tests ───────────────────────────────────────────────────────────────────

describe("issueLicense", () => {
  const baseParams: IssueLicenseParams = {
    userId: "user_123",
    tier: "OPC",
    displayName: "Test Founder",
    email: "test@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLicenseFindFirst.mockResolvedValue(null); // no existing license
    mockLicenseCreate.mockResolvedValue({
      id: "lic_1",
      licenseKey: "NEBUTRA-TEST-KEY",
      tier: "OPC",
      type: "FREE",
      expiresAt: null,
    });
  });

  it("creates a FREE license for INDIVIDUAL tier", async () => {
    const { issueLicense } = await import("../issue-license.js");

    const result = await issueLicense({ ...baseParams, tier: "INDIVIDUAL" });

    expect(mockLicenseCreate).toHaveBeenCalledOnce();
    const createArgs = mockLicenseCreate.mock.calls[0]![0];
    expect(createArgs.data.type).toBe("FREE");
    expect(createArgs.data.tier).toBe("INDIVIDUAL");
    expect(createArgs.data.expiresAt).toBeNull();
    expect(result.type).toBe("FREE");
  });

  it("creates a FREE license for OPC tier", async () => {
    const { issueLicense } = await import("../issue-license.js");

    const result = await issueLicense({ ...baseParams, tier: "OPC" });

    const createArgs = mockLicenseCreate.mock.calls[0]![0];
    expect(createArgs.data.type).toBe("FREE");
    expect(createArgs.data.expiresAt).toBeNull();
    expect(result.type).toBe("FREE");
  });

  it("creates a COMMERCIAL license for STARTUP tier with 1-year expiry", async () => {
    mockLicenseCreate.mockResolvedValue({
      id: "lic_2",
      licenseKey: "NEBUTRA-PAID-KEY",
      tier: "STARTUP",
      type: "COMMERCIAL",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    const { issueLicense } = await import("../issue-license.js");
    const result = await issueLicense({ ...baseParams, tier: "STARTUP" });

    const createArgs = mockLicenseCreate.mock.calls[0]![0];
    expect(createArgs.data.type).toBe("COMMERCIAL");
    expect(createArgs.data.tier).toBe("STARTUP");
    expect(createArgs.data.expiresAt).toBeInstanceOf(Date);
    expect(result.type).toBe("COMMERCIAL");
  });

  it("creates a COMMERCIAL license for ENTERPRISE tier with 1-year expiry", async () => {
    mockLicenseCreate.mockResolvedValue({
      id: "lic_3",
      licenseKey: "NEBUTRA-ENT-KEY",
      tier: "ENTERPRISE",
      type: "COMMERCIAL",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    const { issueLicense } = await import("../issue-license.js");
    const result = await issueLicense({ ...baseParams, tier: "ENTERPRISE" });

    const createArgs = mockLicenseCreate.mock.calls[0]![0];
    expect(createArgs.data.type).toBe("COMMERCIAL");
    expect(createArgs.data.expiresAt).toBeInstanceOf(Date);
    expect(result.type).toBe("COMMERCIAL");
  });

  it("stores acceptedIp and project metadata", async () => {
    const { issueLicense } = await import("../issue-license.js");

    await issueLicense({
      ...baseParams,
      acceptedIp: "1.2.3.4",
      projectName: "MyApp",
      projectUrl: "https://myapp.com",
    });

    const createArgs = mockLicenseCreate.mock.calls[0]![0];
    expect(createArgs.data.acceptedIp).toBe("1.2.3.4");
    expect(createArgs.data.projectName).toBe("MyApp");
    expect(createArgs.data.projectUrl).toBe("https://myapp.com");
  });

  it("enqueues a license.issued event to the queue", async () => {
    const { issueLicense } = await import("../issue-license.js");

    await issueLicense({
      ...baseParams,
      lookingFor: ["co-founder"],
      githubHandle: "testfounder",
    });

    expect(mockEnqueue).toHaveBeenCalledOnce();
    const enqueuedJob = mockEnqueue.mock.calls[0]![0];
    expect(enqueuedJob.queue).toBe("license");
    expect(enqueuedJob.type).toBe("issued");
    expect(enqueuedJob.data.licenseId).toBe("lic_1");
    expect(enqueuedJob.data.userId).toBe("user_123");
    expect(enqueuedJob.data.displayName).toBe("Test Founder");
    expect(enqueuedJob.data.lookingFor).toEqual(["co-founder"]);
    expect(enqueuedJob.data.githubHandle).toBe("testfounder");
  });

  it("returns the created license fields", async () => {
    const { issueLicense } = await import("../issue-license.js");

    const result = await issueLicense(baseParams);

    expect(result).toEqual({
      id: "lic_1",
      licenseKey: "NEBUTRA-TEST-KEY",
      tier: "OPC",
      type: "FREE",
      expiresAt: null,
    });
  });

  it("skips duplicate license if one already exists for user+tier", async () => {
    mockLicenseFindFirst.mockResolvedValue({
      id: "lic_existing",
      licenseKey: "EXISTING-KEY",
      tier: "OPC",
      type: "FREE",
      expiresAt: null,
    });

    const { issueLicense } = await import("../issue-license.js");
    const result = await issueLicense(baseParams);

    expect(mockLicenseCreate).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
    expect(result.id).toBe("lic_existing");
  });
});
