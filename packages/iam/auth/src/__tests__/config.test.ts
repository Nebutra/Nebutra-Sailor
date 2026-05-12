import { describe, expect, it } from "vitest";
import { getConfiguredAuthProvider, isClerkProvider } from "../config";

describe("getConfiguredAuthProvider", () => {
  it("returns better-auth when env is empty", () => {
    expect(getConfiguredAuthProvider({})).toBe("better-auth");
  });

  it("returns better-auth when both vars are undefined", () => {
    expect(
      getConfiguredAuthProvider({ AUTH_PROVIDER: undefined, NEXT_PUBLIC_AUTH_PROVIDER: undefined }),
    ).toBe("better-auth");
  });

  it("server-only AUTH_PROVIDER wins over NEXT_PUBLIC_AUTH_PROVIDER", () => {
    expect(
      getConfiguredAuthProvider({
        AUTH_PROVIDER: "clerk",
        NEXT_PUBLIC_AUTH_PROVIDER: "better-auth",
      }),
    ).toBe("clerk");
  });

  it("falls back to NEXT_PUBLIC_AUTH_PROVIDER when AUTH_PROVIDER missing", () => {
    expect(getConfiguredAuthProvider({ NEXT_PUBLIC_AUTH_PROVIDER: "clerk" })).toBe("clerk");
  });

  it("rejects unknown values and falls back to default", () => {
    expect(getConfiguredAuthProvider({ AUTH_PROVIDER: "auth0" })).toBe("better-auth");
    expect(getConfiguredAuthProvider({ NEXT_PUBLIC_AUTH_PROVIDER: "supabase" })).toBe(
      "better-auth",
    );
  });

  it("accepts all three supported providers", () => {
    expect(getConfiguredAuthProvider({ AUTH_PROVIDER: "clerk" })).toBe("clerk");
    expect(getConfiguredAuthProvider({ AUTH_PROVIDER: "better-auth" })).toBe("better-auth");
    expect(getConfiguredAuthProvider({ AUTH_PROVIDER: "nextauth" })).toBe("nextauth");
  });
});

describe("isClerkProvider", () => {
  it("returns true only for clerk", () => {
    expect(isClerkProvider("clerk")).toBe(true);
    expect(isClerkProvider("better-auth")).toBe(false);
    expect(isClerkProvider("nextauth")).toBe(false);
  });
});
