import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ center: vi.fn(), canonical: vi.fn() }));
vi.mock("@nebutra/auth/auth-center-session", () => ({ fetchAuthCenterSession: deps.center }));
vi.mock("@nebutra/auth/server", () => ({ canonicalUserIdOrNull: deps.canonical }));
vi.mock("@nebutra/logger", () => ({
  logger: { child: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }) },
}));
vi.mock("../config/env.js", () => ({ DOMAINS: { auth: "https://auth.example.test" } }));

import { resolveCallerUserId } from "./caller-identity.js";

type Ctx = Parameters<typeof resolveCallerUserId>[0];
const ctx = (opts: { tenantUserId?: string; authorization?: string } = {}): Ctx =>
  ({
    get: () => (opts.tenantUserId ? { userId: opts.tenantUserId } : undefined),
    req: {
      header: (name: string) => (name === "authorization" ? opts.authorization : undefined),
      raw: new Request("https://gw.test/api"),
    },
  }) as unknown as Ctx;

beforeEach(() => {
  vi.resetAllMocks();
  deps.canonical.mockImplementation(async (id: string) => (id === "ba_owner" ? "cms_owner" : id));
});

describe("resolveCallerUserId", () => {
  it("trusts the id the tenant middleware already resolved (canonical by construction)", async () => {
    expect(await resolveCallerUserId(ctx({ tenantUserId: "cms_owner" }))).toBe("cms_owner");
    expect(deps.center).not.toHaveBeenCalled();
  });

  it("maps the auth center's cookie session to the canonical users id", async () => {
    deps.center.mockResolvedValue({ session: {}, user: { id: "ba_owner" } });
    expect(await resolveCallerUserId(ctx())).toBe("cms_owner");
  });

  it("maps a CLI Bearer token (device login) to the canonical users id", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ user: { id: "ba_owner" } }), { status: 200 }),
      );
    expect(await resolveCallerUserId(ctx({ authorization: "Bearer t" }))).toBe("cms_owner");
    fetchSpy.mockRestore();
  });

  it("leaves an unlinked person's id alone", async () => {
    deps.center.mockResolvedValue({ session: {}, user: { id: "ba_new" } });
    expect(await resolveCallerUserId(ctx())).toBe("ba_new");
  });

  it("is null, never the raw id, when the link store fails", async () => {
    deps.center.mockResolvedValue({ session: {}, user: { id: "ba_owner" } });
    deps.canonical.mockResolvedValue(null);
    expect(await resolveCallerUserId(ctx())).toBeNull();
  });

  it("is null with no session at all", async () => {
    deps.center.mockResolvedValue(null);
    expect(await resolveCallerUserId(ctx())).toBeNull();
  });
});
