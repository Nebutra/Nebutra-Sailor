import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  session: vi.fn(),
  member: vi.fn(),
  tenant: vi.fn(),
  ensure: vi.fn(),
}));
vi.mock("@nebutra/auth/server", () => ({ createAuth: async () => ({ getSession: deps.session }) }));
vi.mock("@nebutra/db", () => ({
  getSystemDb: () => ({
    bAMember: { findUnique: deps.member },
    tenant: { findUnique: deps.tenant },
  }),
}));
vi.mock("@nebutra/repositories", () => ({
  PersonalTenantRepository: class {
    ensure = deps.ensure;
  },
}));

import { resolveMarketScope } from "./scope.js";

beforeEach(() => {
  vi.resetAllMocks();
  deps.session.mockResolvedValue({
    userId: "verified-user",
    expiresAt: new Date(Date.now() + 60000),
  });
});
describe("market workspace authorization", () => {
  it("rejects spoofed identity and workspace headers without a valid session", async () => {
    deps.session.mockResolvedValue(null);
    expect(
      await resolveMarketScope(
        new Request("https://chart.example.com", {
          headers: { "X-User-Id": "victim", "X-KCQ-Workspace": "victim-org" },
        }),
      ),
    ).toBeNull();
    expect(deps.member).not.toHaveBeenCalled();
  });
  it("rejects foreign workspaces using live membership", async () => {
    deps.member.mockResolvedValue(null);
    await expect(
      resolveMarketScope(
        new Request("https://chart.example.com", { headers: { "X-KCQ-Workspace": "victim-org" } }),
      ),
    ).rejects.toThrow("不可访问");
    expect(deps.member).toHaveBeenCalledWith({
      where: { userId_organizationId: { userId: "verified-user", organizationId: "victim-org" } },
      include: { organization: true },
    });
  });
  it.each([
    ["owner", true],
    ["admin", true],
    ["member", false],
    ["viewer", false],
  ])("derives %s privileges from membership", async (role, canManage) => {
    deps.member.mockResolvedValue({ role, organization: { name: "Team" } });
    deps.tenant.mockResolvedValue({ id: "canonical-tenant" });
    expect(
      await resolveMarketScope(
        new Request("https://chart.example.com", {
          headers: { "X-KCQ-Workspace": "team", "X-Role": "owner" },
        }),
      ),
    ).toEqual({ tenantId: "canonical-tenant", canManage });
  });
  it("provisions personal scope from the verified user only", async () => {
    deps.ensure.mockResolvedValue("personal-tenant");
    expect(
      await resolveMarketScope(
        new Request("https://chart.example.com", {
          headers: { "X-KCQ-Workspace": "personal", "X-User-Id": "victim" },
        }),
      ),
    ).toEqual({ tenantId: "personal-tenant", canManage: true });
    expect(deps.ensure).toHaveBeenCalledWith({ userId: "verified-user", email: null });
  });
});
