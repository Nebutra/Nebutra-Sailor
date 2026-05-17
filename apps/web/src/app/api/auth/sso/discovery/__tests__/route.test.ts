import { afterEach, describe, expect, it, vi } from "vitest";

const configuredProviders = JSON.stringify([
  {
    domain: "acme.com",
    id: "acme-okta",
    name: "Acme Okta",
    type: "saml",
    loginUrl: "/api/auth/sso/acme-okta",
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
        loginUrl: "/api/auth/sso/acme-okta?returnUrl=%2Fdashboard",
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
});
