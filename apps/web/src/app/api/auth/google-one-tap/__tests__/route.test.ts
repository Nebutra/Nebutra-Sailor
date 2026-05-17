import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getConfiguredAuthProviderMock = vi.fn(() => "nextauth");
const handleGoogleOneTapSignInMock = vi.fn(
  async (_request: Request) =>
    new Response(null, {
      status: 303,
      headers: { location: "https://app.nebutra.com/dashboard" },
    }),
);

vi.mock("@nebutra/auth", () => ({
  getConfiguredAuthProvider: () => getConfiguredAuthProviderMock(),
}));

vi.mock("@/lib/auth/google-one-tap", () => ({
  handleGoogleOneTapSignIn: (request: Request) => handleGoogleOneTapSignInMock(request),
}));

async function loadRoute() {
  vi.resetModules();
  return import("@/app/api/auth/google-one-tap/route");
}

function makeRequest() {
  return new Request("https://app.nebutra.com/api/auth/google-one-tap", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ credential: "jwt", g_csrf_token: "csrf" }),
  });
}

describe("/api/auth/google-one-tap", () => {
  beforeEach(() => {
    getConfiguredAuthProviderMock.mockReturnValue("nextauth");
    handleGoogleOneTapSignInMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is only enabled for the NextAuth provider", async () => {
    getConfiguredAuthProviderMock.mockReturnValue("better-auth");
    const { POST } = await loadRoute();
    const response = await POST(makeRequest());

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "GOOGLE_ONE_TAP_DISABLED" });
    expect(handleGoogleOneTapSignInMock).not.toHaveBeenCalled();
  });

  it("blocks social sign-in when invite-only access is enabled", async () => {
    vi.stubEnv("ACCESS_GATE_MODE", "invite");
    const { POST } = await loadRoute();
    const response = await POST(makeRequest());

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "ACCESS_GATE_OAUTH_DISABLED" });
    expect(handleGoogleOneTapSignInMock).not.toHaveBeenCalled();
  });

  it("delegates valid NextAuth One Tap posts to the hardened session handler", async () => {
    const { POST } = await loadRoute();
    const response = await POST(makeRequest());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://app.nebutra.com/dashboard");
    expect(handleGoogleOneTapSignInMock).toHaveBeenCalledTimes(1);
  });
});
