import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePlatform = vi.fn();
const grantStaffRole = vi.fn();
const revokeStaffGrant = vi.fn();

vi.mock("@/lib/staff", () => ({ requirePlatform: (...a: unknown[]) => requirePlatform(...a) }));
vi.mock("@/lib/staff-api", () => ({
  grantStaffRole: (...a: unknown[]) => grantStaffRole(...a),
  revokeStaffGrant: (...a: unknown[]) => revokeStaffGrant(...a),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { grantStaffAction, revokeStaffAction } = await import("../../app/staff/actions");

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe("staff console actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePlatform.mockResolvedValue({ userId: "u_owner", role: "platform_owner" });
  });

  it("a tier below owner never reaches the gateway", async () => {
    requirePlatform.mockRejectedValue(
      new Error("Role platform_operator may not grant PlatformStaff."),
    );
    await expect(
      grantStaffAction(form({ email: "a@example.com", role: "platform_support", note: "rota" })),
    ).rejects.toThrow(/may not grant/);
    await expect(revokeStaffAction(form({ userId: "u", note: "left" }))).rejects.toThrow();
    expect(grantStaffRole).not.toHaveBeenCalled();
    expect(revokeStaffGrant).not.toHaveBeenCalled();
    expect(requirePlatform).toHaveBeenCalledWith("grant", "PlatformStaff");
  });

  it("requires a note before asking the gateway", async () => {
    const r = await grantStaffAction(
      form({ email: "a@example.com", role: "platform_support", note: "" }),
    );
    expect(r).toMatchObject({ ok: false, code: "invalid_input" });
    expect(grantStaffRole).not.toHaveBeenCalled();
  });

  it("returns the audit id on success and the gateway's code on refusal", async () => {
    grantStaffRole.mockResolvedValue({
      ok: true,
      data: { role: "platform_support", auditId: "aud-1" },
    });
    expect(
      await grantStaffAction(
        form({ email: "a@example.com", role: "platform_support", note: "rota" }),
      ),
    ).toMatchObject({ ok: true, auditId: "aud-1" });

    revokeStaffGrant.mockResolvedValue({
      ok: false,
      status: 409,
      code: "last_owner",
      message: "Last owner.",
    });
    expect(await revokeStaffAction(form({ userId: "u_owner", note: "step down" }))).toEqual({
      ok: false,
      code: "last_owner",
      message: "Last owner.",
    });
  });
});
