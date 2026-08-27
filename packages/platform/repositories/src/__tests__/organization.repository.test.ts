import { describe, expect, it, vi } from "vitest";
import { OrganizationRepository } from "../organization.repository";

function makePrisma(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    organization: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      ...overrides,
    },
  } as unknown as import("@nebutra/db").PrismaClient;
}

describe("OrganizationRepository.findLogoKey", () => {
  it("returns null when organization is not found", async () => {
    const prisma = makePrisma({
      findUnique: vi.fn().mockResolvedValueOnce(null),
    });
    const repo = new OrganizationRepository(prisma);
    const result = await repo.findLogoKey("org_missing");
    expect(result).toBeNull();
  });

  it("returns null when organization has no logo set", async () => {
    const prisma = makePrisma({
      findUnique: vi.fn().mockResolvedValueOnce({ logo: null }),
    });
    const repo = new OrganizationRepository(prisma);
    const result = await repo.findLogoKey("org_1");
    expect(result).toBeNull();
  });

  it("returns the logo key string when organization has a logo", async () => {
    const prisma = makePrisma({
      findUnique: vi.fn().mockResolvedValueOnce({ logo: "org-logos/org_1/logo.png" }),
    });
    const repo = new OrganizationRepository(prisma);
    const result = await repo.findLogoKey("org_1");
    expect(result).toBe("org-logos/org_1/logo.png");
  });
});

describe("getOrganizationRepository", () => {
  it("is exported from the organization repository module", async () => {
    const { getOrganizationRepository } = await import("../organization.repository");
    expect(typeof getOrganizationRepository).toBe("function");
  });
});
