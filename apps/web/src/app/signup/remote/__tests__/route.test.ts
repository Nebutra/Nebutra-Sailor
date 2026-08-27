import { describe, expect, it } from "vitest";

describe("GET /signup/remote", () => {
  it("redirects a valid Foundry request into the localized sign-up flow", async () => {
    const { GET } = await import("../route");

    const response = await GET(
      new Request(
        "https://app.nebutra.com/signup/remote?scheme=foundry&state=f80fe991-f260-468a-b9fc-9a9b98bf9352&public_beta=true",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.nebutra.com/en/sign-up?returnUrl=%2Fen%2Fdesktop-auth%2Fcomplete%3Fscheme%3Dfoundry%26state%3Df80fe991-f260-468a-b9fc-9a9b98bf9352%26mode%3Dsign-up%26public_beta%3Dtrue",
    );
  });

  it("redirects a valid Foundry OSS request into the localized sign-up flow", async () => {
    const { GET } = await import("../route");

    const response = await GET(
      new Request(
        "https://app.nebutra.com/signup/remote?scheme=foundryoss&state=f80fe991-f260-468a-b9fc-9a9b98bf9352&public_beta=true",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.nebutra.com/en/sign-up?returnUrl=%2Fen%2Fdesktop-auth%2Fcomplete%3Fscheme%3Dfoundryoss%26state%3Df80fe991-f260-468a-b9fc-9a9b98bf9352%26mode%3Dsign-up%26public_beta%3Dtrue",
    );
  });

  it("does not preserve unsafe desktop auth params", async () => {
    const { GET } = await import("../route");

    const response = await GET(
      new Request(
        "https://app.nebutra.com/signup/remote?scheme=javascript&state=f80fe991-f260-468a-b9fc-9a9b98bf9352",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.nebutra.com/en/sign-up?error=invalid_desktop_auth_request",
    );
  });
});
