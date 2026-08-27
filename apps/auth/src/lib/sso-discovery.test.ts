import { describe, expect, it } from "vitest";
import {
  buildSsoLoginUrl,
  extractEmailDomain,
  findSsoProvider,
  parseConfiguredSsoProviders,
  toSsoDiscoveryProvider,
} from "./sso-discovery";

const clerk = {
  domain: "acme.com",
  id: "acme-okta",
  name: "Acme Okta",
  type: "saml" as const,
  provider: "clerk" as const,
  allowSubdomains: false,
};

describe("sso-discovery", () => {
  it("extracts a valid email domain", () => {
    expect(extractEmailDomain("Ada@Acme.com")).toBe("acme.com");
    expect(extractEmailDomain("not-an-email")).toBeNull();
  });

  it("matches exact domains and optional subdomains", () => {
    expect(findSsoProvider("acme.com", [clerk])?.id).toBe("acme-okta");
    expect(findSsoProvider("eng.acme.com", [clerk])).toBeNull();
    expect(findSsoProvider("eng.acme.com", [{ ...clerk, allowSubdomains: true }])?.id).toBe(
      "acme-okta",
    );
  });

  it("builds Clerk handoff URLs on the product origin", () => {
    const url = buildSsoLoginUrl(clerk, {
      identifier: "ada@acme.com",
      returnUrl: "/workspace",
      loginOrigin: "https://app.nebutra.com",
    });
    expect(url.startsWith("https://app.nebutra.com/sign-in/sso?")).toBe(true);
    expect(url).toContain("provider=acme-okta");
    expect(url).toContain("identifier=ada%40acme.com");
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
        {
          identifier: "ada@feishu.cn",
          returnUrl: "/workspace",
          loginOrigin: "https://app.nebutra.com",
        },
      ),
    ).toBe("/api/auth/oauth/feishu?callbackURL=%2Fworkspace");
  });

  it("parses configured providers and maps a discovery payload", () => {
    const providers = parseConfiguredSsoProviders(JSON.stringify([clerk]));
    const provider = providers[0];
    expect(provider).toBeDefined();
    if (!provider) throw new Error("expected configured SSO provider");
    const discovered = toSsoDiscoveryProvider(provider, {
      identifier: "ada@acme.com",
      returnUrl: null,
      loginOrigin: "https://app.nebutra.com",
    });
    expect(discovered.loginUrl).toContain("https://app.nebutra.com/sign-in/sso");
  });
});
