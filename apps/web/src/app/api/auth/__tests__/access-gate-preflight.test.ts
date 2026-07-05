import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const middlewareMock = vi.fn(
  async () =>
    new Response(JSON.stringify({ user: { id: "user_new" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
);
const validateMock = vi.fn(async () => ({ id: "aic_1", status: "active" }));
const redeemMock = vi.fn(async () => ({ status: "redeemed" }));
const signInMock = vi.fn(async () => ({
  ok: true,
  redirectTo: "https://accounts.example/oauth/google",
}));

vi.mock("@nebutra/auth", () => ({
  getAuditableContext: vi.fn(async () => ({
    actor: { id: "user_1", type: "user" },
    tenantId: "tenant_1",
  })),
  getConfiguredAuthProvider: vi.fn(() => "better-auth"),
  sanitizeReturnUrl: vi.fn((input: string | null | undefined, options?: { fallback?: string }) => {
    const fallback = options?.fallback ?? "/";
    if (!input || !input.startsWith("/") || input.startsWith("//")) return fallback;
    return input;
  }),
}));

vi.mock("@nebutra/auth/server", () => ({
  createAuth: vi.fn(async () => ({
    middleware: () => middlewareMock,
    signIn: signInMock,
  })),
}));

vi.mock("@nebutra/access-gate", () => ({
  createAccessGate: vi.fn(() => ({ redeem: redeemMock, validate: validateMock })),
  createPrismaAccessInviteStore: vi.fn(() => ({ kind: "store" })),
}));

vi.mock("@nebutra/audit", () => ({
  auditLogger: vi.fn(() => ({ log: vi.fn(async () => undefined) })),
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  db: {},
}));

vi.mock("@/lib/session-hint", () => ({
  applySessionHint: (_request: Request, response: Response) => response,
}));

function makeSignUpRequest(body: unknown): Request {
  return new Request("https://app.example/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function loadRoute() {
  vi.resetModules();
  return import("@/app/api/auth/[...all]/route");
}

describe("/api/auth sign-up access gate preflight", () => {
  beforeEach(() => {
    vi.stubEnv("ACCESS_GATE_MODE", "invite");
    middlewareMock.mockClear();
    validateMock.mockClear();
    redeemMock.mockClear();
    signInMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects invite-only sign-up before Better Auth when code is missing", async () => {
    const { POST } = await loadRoute();
    const response = await POST(makeSignUpRequest({ email: "ada@example.com", password: "pw" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "ACCESS_INVITE_REQUIRED" });
    expect(validateMock).not.toHaveBeenCalled();
    expect(redeemMock).not.toHaveBeenCalled();
    expect(middlewareMock).not.toHaveBeenCalled();
  });

  it("validates invite code, lets Better Auth handle sign-up, then redeems it", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      makeSignUpRequest({
        email: "ada@example.com",
        password: "pw",
        accessInviteCode: "neb_valid",
        tenantId: "tenant_1",
      }),
    );

    expect(response.status).toBe(200);
    expect(validateMock).toHaveBeenCalledWith({
      plaintextCode: "neb_valid",
      email: "ada@example.com",
      tenantId: "tenant_1",
    });
    expect(middlewareMock).toHaveBeenCalledTimes(1);
    expect(redeemMock).toHaveBeenCalledWith({
      plaintextCode: "neb_valid",
      redeemedByUserId: "user_new",
      email: "ada@example.com",
      tenantId: "tenant_1",
    });
  });

  it("blocks OAuth entrypoints while invite-only access is enabled", async () => {
    const { GET } = await loadRoute();
    const response = await GET(
      new Request("https://app.example/api/auth/oauth/google?callback=/onboarding"),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "ACCESS_GATE_OAUTH_DISABLED" });
    expect(middlewareMock).not.toHaveBeenCalled();
    expect(validateMock).not.toHaveBeenCalled();
    expect(redeemMock).not.toHaveBeenCalled();
  });

  it("blocks Better Auth Google One Tap callback while invite-only access is enabled", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/auth/one-tap/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken: "google-id-token" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "ACCESS_GATE_OAUTH_DISABLED" });
    expect(middlewareMock).not.toHaveBeenCalled();
    expect(validateMock).not.toHaveBeenCalled();
    expect(redeemMock).not.toHaveBeenCalled();
  });

  it("fails closed when post-signup invite redemption fails", async () => {
    redeemMock.mockRejectedValueOnce(new Error("compare-and-swap failed"));
    const { POST } = await loadRoute();
    const response = await POST(
      makeSignUpRequest({
        email: "ada@example.com",
        password: "pw",
        accessInviteCode: "neb_valid",
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      code: "ACCESS_INVITE_REDEMPTION_FAILED",
      error: "Invite redemption failed. Contact support before retrying.",
    });
    expect(validateMock).toHaveBeenCalledWith({
      plaintextCode: "neb_valid",
      email: "ada@example.com",
    });
    expect(middlewareMock).toHaveBeenCalledTimes(1);
    expect(redeemMock).toHaveBeenCalledWith({
      plaintextCode: "neb_valid",
      redeemedByUserId: "user_new",
      email: "ada@example.com",
    });
  });
});

describe("/api/auth OAuth start compatibility", () => {
  beforeEach(() => {
    vi.stubEnv("ACCESS_GATE_MODE", "open");
    middlewareMock.mockClear();
    signInMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("starts OAuth through the configured auth provider instead of falling through to 404", async () => {
    const { GET } = await loadRoute();
    const response = await GET(
      new Request("https://app.example/api/auth/oauth/google?callback=/dashboard"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://accounts.example/oauth/google");
    expect(signInMock).toHaveBeenCalledWith({
      type: "oauth",
      provider: "google",
      redirectUrl: "/dashboard",
    });
    expect(middlewareMock).not.toHaveBeenCalled();
  });

  it("sanitizes unsafe OAuth callback targets before starting the provider flow", async () => {
    const { GET } = await loadRoute();
    await GET(new Request("https://app.example/api/auth/oauth/github?callback=//evil.example/x"));

    expect(signInMock).toHaveBeenCalledWith({
      type: "oauth",
      provider: "github",
      redirectUrl: "/",
    });
  });

  it("rejects unsupported OAuth providers with an explicit client error", async () => {
    const { GET } = await loadRoute();
    const response = await GET(new Request("https://app.example/api/auth/oauth/dropbox"));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "OAUTH_PROVIDER_NOT_SUPPORTED" });
    expect(signInMock).not.toHaveBeenCalled();
    expect(middlewareMock).not.toHaveBeenCalled();
  });
});
