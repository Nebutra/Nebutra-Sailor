import { describe, expect, it } from "vitest";
import { getConfiguredAuthProvider } from "../config";

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
        AUTH_PROVIDER: "dev",
        NEXT_PUBLIC_AUTH_PROVIDER: "better-auth",
      }),
    ).toBe("dev");
  });

  it("falls back to NEXT_PUBLIC_AUTH_PROVIDER when AUTH_PROVIDER missing", () => {
    expect(getConfiguredAuthProvider({ NEXT_PUBLIC_AUTH_PROVIDER: "dev" })).toBe("dev");
  });

  it("rejects unknown values and falls back to default", () => {
    expect(getConfiguredAuthProvider({ AUTH_PROVIDER: "auth0" })).toBe("better-auth");
  });

  it("accepts all supported providers", () => {
    expect(getConfiguredAuthProvider({ AUTH_PROVIDER: "better-auth" })).toBe("better-auth");
    expect(getConfiguredAuthProvider({ AUTH_PROVIDER: "dev" })).toBe("dev");
    expect(getConfiguredAuthProvider({ NEXT_PUBLIC_AUTH_PROVIDER: "dev" })).toBe("dev");
  });
});
