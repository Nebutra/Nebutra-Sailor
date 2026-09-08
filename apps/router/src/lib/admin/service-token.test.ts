import { describe, expect, it } from "vitest";

vi.mock("server-only", () => ({}));

import { vi } from "vitest";

const { signServiceToken } = await import("@nebutra/auth");
const { gateStaff } = await import("./service-token");

describe("gateStaff", () => {
  it("admits a signed staff token and enforces the ladder", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    const token = await signServiceToken({ userId: "u1", role: "platform_operator" });
    const req = new Request("https://router/api/admin/v1/supply/engines", {
      headers: { "x-service-token": token, "x-user-id": "u1", "x-role": "platform_operator" },
    });
    const ok = await gateStaff(req, "platform_operator");
    expect(ok.ok).toBe(true);
    const tooHigh = await gateStaff(req, "platform_owner");
    expect(tooHigh.ok === false && tooHigh.status).toBe(403);
  });

  it("rejects mismatched claims, product roles, and missing tokens", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    const token = await signServiceToken({ userId: "u1", role: "platform_operator" });
    const forged = new Request("https://router/x", {
      headers: { "x-service-token": token, "x-user-id": "u1", "x-role": "platform_owner" },
    });
    expect((await gateStaff(forged)).ok).toBe(false);
    const product = await signServiceToken({ userId: "u1", role: "org:admin" });
    const wrongLadder = new Request("https://router/x", {
      headers: { "x-service-token": product, "x-user-id": "u1", "x-role": "org:admin" },
    });
    expect((await gateStaff(wrongLadder)).ok).toBe(false);
    expect((await gateStaff(new Request("https://router/x"))).ok).toBe(false);
  });
});
