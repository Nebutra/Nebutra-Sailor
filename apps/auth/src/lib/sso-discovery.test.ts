import { describe, expect, it } from "vitest";
import {
  buildSsoLoginUrl,
  extractEmailDomain,
  findSsoProvider,
  parseConfiguredSsoProviders,
  ssoProviderSchema,
  toSsoDiscoveryProvider,
} from "./sso-discovery";

const okta = {
  domain: "acme.com",
  id: "acme-okta",
  name: "Acme Okta",
  type: "saml" as const,
  provider: "generic" as const,
  loginUrl: "/sso/acme",
  allowSubdomains: false,
};

describe("sso-discovery", () => {
  it("extracts a valid email domain", () => {
    expect(extractEmailDomain("Ada@Acme.com")).toBe("acme.com");
    expect(extractEmailDomain("not-an-email")).toBeNull();
  });

  it("matches exact domains and optional subdomains", () => {
    expect(findSsoProvider("acme.com", [okta])?.id).toBe("acme-okta");
    expect(findSsoProvider("eng.acme.com", [okta])).toBeNull();
    expect(findSsoProvider("eng.acme.com", [{ ...okta, allowSubdomains: true }])?.id).toBe(
      "acme-okta",
    );
  });

  it("sends generic providers to their configured loginUrl with the return path", () => {
    expect(buildSsoLoginUrl(okta, { identifier: "ada@acme.com", returnUrl: "/workspace" })).toBe(
      "/sso/acme?returnUrl=%2Fworkspace",
    );
  });

  it("keeps Feishu start paths on the auth host", () => {
    expect(
      buildSsoLoginUrl(
        {
          domain: "feishu.cn",
          id: "feishu",
          name: "Feishu",
          type: "oidc",
          provider: "feishu",
          allowSubdomains: false,
        },
        { identifier: "ada@feishu.cn", returnUrl: "/workspace" },
      ),
    ).toBe("/api/auth/oauth/feishu?callbackURL=%2Fworkspace");
  });

  it("rejects the removed clerk provider and generic providers without loginUrl", () => {
    expect(ssoProviderSchema.safeParse({ ...okta, provider: "clerk" }).success).toBe(false);
    expect(ssoProviderSchema.safeParse({ ...okta, loginUrl: undefined }).success).toBe(false);
  });

  it("parses configured providers and maps a discovery payload", () => {
    const providers = parseConfiguredSsoProviders(JSON.stringify([okta]));
    const provider = providers[0];
    expect(provider).toBeDefined();
    if (!provider) throw new Error("expected configured SSO provider");
    const discovered = toSsoDiscoveryProvider(provider, {
      identifier: "ada@acme.com",
      returnUrl: null,
    });
    expect(discovered.loginUrl).toBe("/sso/acme");
  });
});
