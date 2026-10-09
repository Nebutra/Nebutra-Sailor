import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ session: vi.fn(), grant: vi.fn() }));
vi.mock("@nebutra/auth/server", () => ({ createAuth: async () => ({ getSession: deps.session }) }));
vi.mock("@nebutra/db", () => ({
  getSystemDb: () => ({ platformStaff: { findUnique: deps.grant } }),
}));
vi.mock("@nebutra/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }), error: vi.fn() },
}));

import { resolveKcqAiIdentity } from "./ai.js";

const req = () => new Request("https://x.test");
beforeEach(() => {
  vi.resetAllMocks();
  deps.session.mockResolvedValue({ userId: "u1", expiresAt: new Date(Date.now() + 60_000) });
});

describe("resolveKcqAiIdentity staff lookup", () => {
  it("no session is anonymous", async () => {
    deps.session.mockResolvedValue(null);
    expect(await resolveKcqAiIdentity(req())).toBeNull();
    expect(deps.grant).not.toHaveBeenCalled();
  });
  it("matches staff by the verified session user id (not email)", async () => {
    deps.grant.mockResolvedValue({ role: "PLATFORM_OPERATOR", revokedAt: null });
    expect(await resolveKcqAiIdentity(req())).toEqual({
      userId: "u1",
      staffRole: "platform_operator",
    });
    expect(deps.grant).toHaveBeenCalledWith({
      where: { userId: "u1" },
      select: { role: true, revokedAt: true },
    });
  });
  it.each([
    ["no grant", null],
    ["revoked grant", { role: "PLATFORM_OWNER", revokedAt: new Date() }],
    ["unknown role", { role: "SUPERUSER", revokedAt: null }],
  ])("%s is not staff", async (_label, grant) => {
    deps.grant.mockResolvedValue(grant);
    expect(await resolveKcqAiIdentity(req())).toEqual({ userId: "u1", staffRole: null });
  });
});

describe("resolveKcqAiIdentity canonical identity", () => {
  it("looks the grant up by the canonical id and keeps the auth-center id apart", async () => {
    // The auth provider already mapped ba_owner -> cms_owner (user_identity_links).
    deps.session.mockResolvedValue({
      userId: "cms_owner",
      authUserId: "ba_owner",
      expiresAt: new Date(Date.now() + 60_000),
    });
    deps.grant.mockResolvedValue({ role: "PLATFORM_OWNER", revokedAt: null });
    expect(await resolveKcqAiIdentity(req())).toEqual({
      userId: "cms_owner",
      authUserId: "ba_owner",
      staffRole: "platform_owner",
    });
    expect(deps.grant).toHaveBeenCalledWith({
      where: { userId: "cms_owner" },
      select: { role: true, revokedAt: true },
    });
  });
});
