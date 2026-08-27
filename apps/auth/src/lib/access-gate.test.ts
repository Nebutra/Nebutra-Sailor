import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validateMock = vi.fn(async () => ({ id: "aic_1", status: "active" }));
const redeemMock = vi.fn(async () => ({ status: "redeemed" }));

vi.mock("@nebutra/access-gate", () => ({
  createAccessGate: vi.fn(() => ({ redeem: redeemMock, validate: validateMock })),
  createPrismaAccessInviteStore: vi.fn(() => ({ kind: "store" })),
}));

vi.mock("@nebutra/db", () => ({
  getSystemDb: vi.fn(() => ({})),
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

import {
  enforceAccessGatePreflight,
  extractSignedUpUserId,
  isEmailSignUpRequest,
  isOAuthRequest,
  readAccessGateSignupContext,
  redeemAccessInviteAfterSignup,
} from "./access-gate";

function signUpRequest(body: unknown): Request {
  return new Request("https://auth.example/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("access-gate request helpers", () => {
  it("recognizes email sign-up and OAuth entrypoints", () => {
    expect(isEmailSignUpRequest(signUpRequest({ email: "a@b.com" }))).toBe(true);
    expect(isOAuthRequest(new Request("https://auth.example/api/auth/oauth/google"))).toBe(true);
    expect(
      isOAuthRequest(
        new Request("https://auth.example/api/auth/one-tap/callback", { method: "POST" }),
      ),
    ).toBe(true);
  });

  it("pulls user ids from Better Auth signup payloads", () => {
    expect(extractSignedUpUserId({ user: { id: "user_new" } })).toBe("user_new");
    expect(extractSignedUpUserId({ data: { user: { id: "nested" } } })).toBe("nested");
    expect(extractSignedUpUserId({})).toBeNull();
  });
});

describe("access-gate signup preflight", () => {
  beforeEach(() => {
    vi.stubEnv("ACCESS_GATE_MODE", "invite");
    validateMock.mockClear();
    redeemMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects invite-only sign-up when the code is missing", async () => {
    const result = await readAccessGateSignupContext(
      signUpRequest({ email: "ada@example.com", password: "pw" }),
    );
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
    expect(await (result as Response).json()).toMatchObject({ code: "ACCESS_INVITE_REQUIRED" });
  });

  it("validates then redeems after a successful signup", async () => {
    const context = await readAccessGateSignupContext(
      signUpRequest({
        email: "ada@example.com",
        password: "pw",
        accessInviteCode: "neb_valid",
        tenantId: "tenant_1",
      }),
    );
    expect(context).toMatchObject({
      email: "ada@example.com",
      plaintextCode: "neb_valid",
      tenantId: "tenant_1",
    });

    const preflight = await enforceAccessGatePreflight(
      context as Exclude<typeof context, Response>,
    );
    expect(preflight).toBeNull();
    expect(validateMock).toHaveBeenCalledWith({
      plaintextCode: "neb_valid",
      email: "ada@example.com",
      tenantId: "tenant_1",
    });

    const ok = new Response(JSON.stringify({ user: { id: "user_new" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const redemption = await redeemAccessInviteAfterSignup(
      context as Exclude<typeof context, Response>,
      ok,
    );
    expect(redemption).toBeNull();
    expect(redeemMock).toHaveBeenCalledWith({
      plaintextCode: "neb_valid",
      redeemedByUserId: "user_new",
      email: "ada@example.com",
      tenantId: "tenant_1",
    });
  });

  it("fails closed when post-signup redemption fails", async () => {
    redeemMock.mockRejectedValueOnce(new Error("compare-and-swap failed"));
    const response = await redeemAccessInviteAfterSignup(
      { email: "ada@example.com", plaintextCode: "neb_valid" },
      new Response(JSON.stringify({ user: { id: "user_new" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    expect(response?.status).toBe(500);
    expect(await response?.json()).toMatchObject({ code: "ACCESS_INVITE_REDEMPTION_FAILED" });
  });
});
