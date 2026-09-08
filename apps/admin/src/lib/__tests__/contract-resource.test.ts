import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const staff = { userId: "u1", email: "ops@example.com", role: "platform_readonly" };
const requireStaff = vi.fn(async () => staff);
vi.mock("../staff", () => ({
  requireStaff: () => requireStaff(),
  StaffAccessError: class extends Error {},
}));

const manifest = {
  domains: [
    {
      id: "supply",
      resources: [
        {
          id: "login",
          label: "Sign-ins in progress",
          list: "/api/admin/v1/supply/logins",
          key: "id",
          columns: [],
          search: false,
          actions: [],
        },
      ],
      actions: [],
      signals: [],
      policies: [],
    },
  ],
};
const list = { items: [{ id: "s1", status: "wait" }], total: 1, probedAt: "2026-09-08T00:00:00Z" };
const listResource = vi.fn(async () => list);
const loadManifest = vi.fn(async () => manifest);
vi.mock("../contract-client", () => ({
  loadManifest: () => loadManifest(),
  listResource: (...args: unknown[]) => listResource(...(args as [])),
  ContractError: class extends Error {
    constructor(
      readonly code: string,
      message: string,
      readonly status?: number,
    ) {
      super(message);
    }
  },
}));

const { handleContractResource } = await import("../contract-resource");

describe("contract resource route", () => {
  beforeEach(() => {
    listResource.mockClear();
    requireStaff.mockImplementation(async () => staff);
  });

  it("lists a declared resource signed with the caller's role", async () => {
    const res = await handleContractResource({ serviceId: "@nebutra/router", resourceId: "login" });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual(list);
    expect(listResource).toHaveBeenCalledWith(manifest, "/api/admin/v1/supply/logins", {
      userId: "u1",
      role: "platform_readonly",
    });
  });

  it("404s a resource the manifest does not declare", async () => {
    const res = await handleContractResource({ serviceId: "@nebutra/router", resourceId: "nope" });
    expect(res.status).toBe(404);
    expect(listResource).not.toHaveBeenCalled();
  });

  it("400s a missing query", async () => {
    const res = await handleContractResource({ serviceId: null, resourceId: "login" });
    expect(res.status).toBe(400);
  });

  it("403s when the caller is not staff", async () => {
    const { StaffAccessError } = await import("../staff");
    requireStaff.mockImplementation(async () => {
      throw new StaffAccessError("not staff");
    });
    const res = await handleContractResource({ serviceId: "@nebutra/router", resourceId: "login" });
    expect(res.status).toBe(403);
    expect(listResource).not.toHaveBeenCalled();
  });
});
