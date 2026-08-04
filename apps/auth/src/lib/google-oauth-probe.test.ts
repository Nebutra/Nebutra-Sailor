import { afterEach, describe, expect, it, vi } from "vitest";
import { probeGoogleOAuthPairing } from "./google-oauth-probe";

describe("probeGoogleOAuthPairing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports incomplete_env when secrets missing", async () => {
    const result = await probeGoogleOAuthPairing("https://auth.nebutra.com", {});
    expect(result.status).toBe("incomplete_env");
    expect(result.clientIdSuffix).toBeNull();
  });

  it("maps invalid_grant to pair_ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: "invalid_grant", error_description: "Malformed auth code." }),
            {
              status: 400,
            },
          ),
      ),
    );
    const result = await probeGoogleOAuthPairing("https://auth.nebutra.com", {
      GOOGLE_CLIENT_ID: "352727270266-test.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "GOCSPX-test",
    });
    expect(result.status).toBe("pair_ok");
    expect(result.googleError).toBe("invalid_grant");
    expect(result.redirectUri).toBe("https://auth.nebutra.com/api/auth/callback/google");
  });

  it("maps invalid_client when secret wrong", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "invalid_client", error_description: "invalid" }), {
            status: 401,
          }),
      ),
    );
    const result = await probeGoogleOAuthPairing("https://auth.example", {
      GOOGLE_CLIENT_ID: "id.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "bad",
    });
    expect(result.status).toBe("invalid_client");
  });
});
