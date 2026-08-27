import { describe, expect, it } from "vitest";
import { getIdpRuntimeConfig } from "./oidc-config";

describe("IdP runtime configuration", () => {
  it("uses local issuer defaults only outside production", () => {
    expect(getIdpRuntimeConfig({ NODE_ENV: "development" }).issuer).toBe("http://localhost:3100");
  });

  it("requires an explicit issuer in production", () => {
    expect(() => getIdpRuntimeConfig({ NODE_ENV: "production" })).toThrow(
      "OIDC_ISSUER is required in production",
    );
  });

  it("requires a production https issuer on the origin", () => {
    expect(() =>
      getIdpRuntimeConfig({
        NODE_ENV: "production",
        OIDC_ISSUER: "http://sso.nebutra.com",
      }),
    ).toThrow("must use https://");

    expect(() =>
      getIdpRuntimeConfig({
        NODE_ENV: "production",
        OIDC_ISSUER: "https://localhost:3100",
      }),
    ).toThrow("cannot point at localhost");

    expect(() =>
      getIdpRuntimeConfig({
        NODE_ENV: "production",
        OIDC_ISSUER: "https://sso.nebutra.com/api/oidc",
      }),
    ).toThrow("must be the origin only");
  });

  it("accepts the canonical sso.nebutra.com issuer and trims trailing slash", () => {
    expect(
      getIdpRuntimeConfig({
        NODE_ENV: "production",
        OIDC_ISSUER: "https://sso.nebutra.com/",
        OIDC_COOKIE_KEYS: `${"a".repeat(48)},${"b".repeat(48)}`,
      }),
    ).toEqual({
      issuer: "https://sso.nebutra.com",
      cookieKeys: ["a".repeat(48), "b".repeat(48)],
      enableClientCredentials: false,
    });
  });

  it("requires explicit opt-in for client_credentials", () => {
    expect(
      getIdpRuntimeConfig({
        NODE_ENV: "production",
        OIDC_ISSUER: "https://sso.nebutra.com",
        OIDC_ENABLE_CLIENT_CREDENTIALS: "true",
      }).enableClientCredentials,
    ).toBe(true);
  });
});
