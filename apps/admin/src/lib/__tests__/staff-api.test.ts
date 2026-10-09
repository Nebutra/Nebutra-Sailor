import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/auth", () => ({
  signServiceToken: vi.fn(async () => "signed-token"),
}));

const { gatewayOrigin, grantStaffRole, listStaffGrants, revokeStaffGrant } = await import(
  "../staff-api"
);

const caller = { userId: "u_owner", role: "platform_owner" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("staff gateway client", () => {
  beforeEach(() => {
    delete process.env.ADMIN_GATEWAY_URL;
  });

  it("signs the request as the staff member and never sends a bearer", async () => {
    process.env.ADMIN_GATEWAY_URL = "https://gw.test/";
    const fetchMock = vi.fn(async () => json({ staff: [] }));
    await listStaffGrants(caller, fetchMock as never);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://gw.test/api/v1/platform/staff");
    expect(init.headers).toMatchObject({
      "x-service-token": "signed-token",
      "x-user-id": "u_owner",
      "x-role": "platform_owner",
    });
    expect(init.headers).not.toHaveProperty("authorization");
  });

  it("defaults to the brand api origin", () => {
    expect(gatewayOrigin()).toMatch(/^https:\/\/api\./);
  });

  it("posts a grant and a revoke to the right paths", async () => {
    process.env.ADMIN_GATEWAY_URL = "https://gw.test";
    const fetchMock = vi.fn(async () => json({ role: "platform_operator", auditId: "a1" }, 201));
    const granted = await grantStaffRole(
      caller,
      { email: "a@example.com", role: "platform_operator", note: "rota" },
      fetchMock as never,
    );
    expect(granted).toMatchObject({ ok: true, data: { auditId: "a1" } });
    await revokeStaffGrant(caller, "u 1", "left", fetchMock as never);
    const urls = fetchMock.mock.calls.map((c) => (c as unknown as [string])[0]);
    expect(urls).toEqual([
      "https://gw.test/api/v1/platform/staff",
      "https://gw.test/api/v1/platform/staff/u%201/revoke",
    ]);
  });

  it("returns the gateway's refusal with its code instead of throwing", async () => {
    const fetchMock = vi.fn(async () =>
      json({ error: "This is the last active platform owner.", code: "last_owner" }, 409),
    );
    const result = await revokeStaffGrant(caller, "u_owner", "step down", fetchMock as never);
    expect(result).toEqual({
      ok: false,
      status: 409,
      code: "last_owner",
      message: "This is the last active platform owner.",
    });
  });

  it("reports an unreachable gateway as a result, not a crash", async () => {
    const result = await listStaffGrants(caller, (async () => {
      throw new Error("ECONNREFUSED");
    }) as never);
    expect(result).toMatchObject({ ok: false, code: "network", message: "ECONNREFUSED" });
  });
});
