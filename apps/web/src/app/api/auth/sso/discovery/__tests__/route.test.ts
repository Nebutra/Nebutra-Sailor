import { afterEach, describe, expect, it, vi } from "vitest";

const configuredProviders = JSON.stringify([
  {
    domain: "acme.com",
    id: "acme-okta",
    name: "Acme Okta",
    type: "saml",
    provider: "generic",
    loginUrl: "/api/auth/sso/acme-okta",
    allowSubdomains: true,
  },
]);

const clerkConfiguredProviders = JSON.stringify([
  {
    domain: "nebutra.com",
    id: "nebutra-entra",
    name: "Nebutra Entra ID",
    type: "oidc",
    provider: "clerk",
  },
]);

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

describe("GET /api/auth/sso/discovery", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns a configured SSO provider for the email domain without user lookup", async () => {
    vi.stubEnv("AUTH_SSO_DISCOVERY_PROVIDERS", configuredProviders);
    const { GET } = await loadRoute();

    const res = await GET(
      new Request(
        "https://app.example/api/auth/sso/discovery?email=owner@ACME.com&returnUrl=/dashboard",
      ),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      provider: {
        domain: "acme.com",
        id: "acme-okta",
        name: "Acme Okta",
        type: "saml",
        provider: "generic",
        loginUrl: "/api/auth/sso/acme-okta?returnUrl=%2Fdashboard",
      },
    });
  });

  it("builds the default Clerk Enterprise SSO handoff URL", async () => {
    vi.stubEnv("AUTH_SSO_DISCOVERY_PROVIDERS", clerkConfiguredProviders);
    const { GET } = await loadRoute();

    const res = await GET(
      new Request(
        "https://app.example/api/auth/sso/discovery?email=Owner@Nebutra.com&returnUrl=/atelier",
      ),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      provider: {
        domain: "nebutra.com",
        id: "nebutra-entra",
        name: "Nebutra Entra ID",
        type: "oidc",
        provider: "clerk",
        loginUrl:
          "/sign-in/sso?provider=nebutra-entra&providerName=Nebutra+Entra+ID&identifier=owner%40nebutra.com&returnUrl=%2Fatelier",
      },
    });
  });

  it("matches subdomains to the parent SSO domain", async () => {
    vi.stubEnv("AUTH_SSO_DISCOVERY_PROVIDERS", configuredProviders);
    const { GET } = await loadRoute();

    const res = await GET(
      new Request("https://app.example/api/auth/sso/discovery?email=owner@eu.acme.com"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      provider: {
        domain: "acme.com",
        id: "acme-okta",
      },
    });
  });

  it("does not match subdomains unless the provider opts in", async () => {
    vi.stubEnv("AUTH_SSO_DISCOVERY_PROVIDERS", clerkConfiguredProviders);
    const { GET } = await loadRoute();

    const res = await GET(
      new Request("https://app.example/api/auth/sso/discovery?email=owner@eu.nebutra.com"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ provider: null });
  });

  it("does not expose untrusted returnUrl values in the SSO handoff", async () => {
    vi.stubEnv("AUTH_SSO_DISCOVERY_PROVIDERS", configuredProviders);
    const { GET } = await loadRoute();

    const res = await GET(
      new Request(
        "https://app.example/api/auth/sso/discovery?email=owner@acme.com&returnUrl=https://evil.example",
      ),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      provider: {
        loginUrl: "/api/auth/sso/acme-okta",
      },
    });
  });

  it("keeps anti-enumeration behavior for invalid or unmapped emails", async () => {
    vi.stubEnv("AUTH_SSO_DISCOVERY_PROVIDERS", configuredProviders);
    const { GET } = await loadRoute();

    const invalid = await GET(new Request("https://app.example/api/auth/sso/discovery?email=nope"));
    const unmapped = await GET(
      new Request("https://app.example/api/auth/sso/discovery?email=user@example.com"),
    );

    expect(invalid.status).toBe(200);
    expect(unmapped.status).toBe(200);
    expect(await invalid.json()).toEqual({ provider: null });
    expect(await unmapped.json()).toEqual({ provider: null });
  });

  it("ignores malformed provider config instead of serving unsafe handoff URLs", async () => {
    vi.stubEnv(
      "AUTH_SSO_DISCOVERY_PROVIDERS",
      JSON.stringify([
        {
          domain: "evil.com",
          id: "evil",
          name: "Unsafe",
          type: "saml",
          provider: "generic",
          loginUrl: "https://evil.example/sso",
        },
      ]),
    );
    const { GET } = await loadRoute();

    const res = await GET(
      new Request("https://app.example/api/auth/sso/discovery?email=owner@evil.com"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ provider: null });
  });
});
