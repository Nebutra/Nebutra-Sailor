import { beforeEach, describe, expect, it, vi } from "vitest";

const tenantFindUnique = vi.hoisted(() => vi.fn());
const profileFindUnique = vi.hoisted(() => vi.fn());
const userFindById = vi.hoisted(() => vi.fn());
const issueLicense = vi.hoisted(() => vi.fn());

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => ({
    tenant: { findUnique: tenantFindUnique },
    communityProfile: { findUnique: profileFindUnique },
  }),
}));
vi.mock("@nebutra/license", () => ({ issueLicense }));
vi.mock("@nebutra/repositories", () => ({
  UserRepository: class {
    findById(id: string) {
      return userFindById(id);
    }
  },
}));

const { getFulfillment } = await import("@nebutra/billing");
await import("../services/license-fulfillment.js");

const ctx = (params: Record<string, unknown>) => ({
  orderId: "ord_1",
  organizationId: "tenant_personal_1",
  product: "license",
  params,
});

describe("license fulfillment (Creem-paid support plan)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantFindUnique.mockResolvedValue({ userId: "user_1" });
    userFindById.mockResolvedValue({ id: "user_1", email: "a@example.com", name: "Ada" });
    profileFindUnique.mockResolvedValue({ githubHandle: "ada" });
    issueLicense.mockResolvedValue({ id: "lic_1" });
  });

  it("issues the paid license to the personal tenant's owner", async () => {
    await getFulfillment("license").fulfill(ctx({ tier: "STARTUP" }));
    expect(tenantFindUnique).toHaveBeenCalledWith({
      where: { id: "tenant_personal_1" },
      select: { userId: true },
    });
    expect(issueLicense).toHaveBeenCalledWith({
      userId: "user_1",
      tier: "STARTUP",
      displayName: "Ada",
      email: "a@example.com",
      githubHandle: "ada",
    });
  });

  it("refuses a tier a payment cannot grant", async () => {
    await expect(getFulfillment("license").fulfill(ctx({ tier: "OPC" }))).rejects.toThrow(
      /params\.tier/,
    );
    expect(issueLicense).not.toHaveBeenCalled();
  });

  it("refuses an order that is not on a personal tenant", async () => {
    tenantFindUnique.mockResolvedValue({ userId: null });
    await expect(getFulfillment("license").fulfill(ctx({ tier: "STARTUP" }))).rejects.toThrow(
      /personal tenant/,
    );
    expect(issueLicense).not.toHaveBeenCalled();
  });
});
