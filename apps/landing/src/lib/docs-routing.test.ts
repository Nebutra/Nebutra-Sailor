import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPublicDocsUrl } from "./docs-links";
import { createDocsLocaleRedirectPath, createDocsRewriteUrl } from "./docs-routing";

const SITE = getBrandOrigin("landing");

function url(path: string): URL {
  return new URL(`${SITE}${path}`);
}

/**
 * A stand-in origin, not the real one. The upstream is deployment config
 * (DOCS_UPSTREAM_ORIGIN), so naming the instance's Fly app here would put a
 * brand literal in template code — and would stop testing the seam that makes
 * the origin configurable at all.
 */
const UPSTREAM = "https://docs-origin.example";

beforeEach(() => {
  vi.stubEnv("DOCS_UPSTREAM_ORIGIN", UPSTREAM);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("docs URL governance", () => {
  it("publishes docs as a path on the site, not a host of their own", () => {
    // Documentation used to live at docs.<domain> and /docs 308'd there, so a
    // product's own host was never where its documentation lived. The public
    // URL is now a path, and the subdomain is gone from brand.domains entirely.
    expect(createPublicDocsUrl()).toBe(`${SITE}/docs`);
    expect(createPublicDocsUrl("guides/multi-tenancy")).toBe(`${SITE}/docs/guides/multi-tenancy`);
    expect(createPublicDocsUrl("/docs/payments/overview")).toBe(`${SITE}/docs/payments/overview`);
  });
});

describe("createDocsRewriteUrl", () => {
  it("forwards the path unchanged, /docs prefix included", () => {
    // Identity is the contract. The zone sets a matching basePath, so the path
    // the visitor asked for is the path the zone serves — no segment is added,
    // removed or translated in either direction.
    expect(createDocsRewriteUrl(url("/docs"))?.toString()).toBe(`${UPSTREAM}/docs`);
    expect(createDocsRewriteUrl(url("/docs/guides/auth"))?.toString()).toBe(
      `${UPSTREAM}/docs/guides/auth`,
    );
    expect(createDocsRewriteUrl(url("/docs/zh/guides/auth"))?.toString()).toBe(
      `${UPSTREAM}/docs/zh/guides/auth`,
    );
  });

  it("forwards the zone's assets, which is why identity is not merely tidy", () => {
    // The previous mapping stripped /docs and injected a locale, so the zone's
    // own `/docs/_next/...` URLs had nowhere to land: every stylesheet and script
    // 404'd against this app's origin and `<site>/docs` rendered unstyled.
    expect(createDocsRewriteUrl(url("/docs/_next/static/chunks/main.js"))?.toString()).toBe(
      `${UPSTREAM}/docs/_next/static/chunks/main.js`,
    );
    expect(createDocsRewriteUrl(url("/docs/sitemap.xml"))?.toString()).toBe(
      `${UPSTREAM}/docs/sitemap.xml`,
    );
  });

  it("preserves the query string", () => {
    expect(createDocsRewriteUrl(url("/docs/search?q=tenancy"))?.toString()).toBe(
      `${UPSTREAM}/docs/search?q=tenancy`,
    );
  });

  it("claims nothing outside the docs zone", () => {
    expect(createDocsRewriteUrl(url("/features"))).toBeNull();
    expect(createDocsRewriteUrl(url("/"))).toBeNull();
    // A path that merely starts with the same letters is not documentation.
    expect(createDocsRewriteUrl(url("/docsearch"))).toBeNull();
  });

  it("leaves the locale-prefixed shape to the redirect, not the forward", () => {
    // `/zh-Hans/docs/...` is this app's path space, not the zone's. Forwarding it
    // verbatim would ask the zone for a route it does not have.
    expect(createDocsRewriteUrl(url("/zh-Hans/docs/cli/create-sailor"))).toBeNull();
    expect(createDocsRewriteUrl(url("/en/docs/cli/create-sailor"))).toBeNull();
  });

  it("turns /docs into an ordinary 404 when no upstream is configured", () => {
    // The origin is deployment config, so a deployment that does not host docs
    // must get a 404 from the app rather than a forward to nowhere.
    vi.stubEnv("DOCS_UPSTREAM_ORIGIN", "");
    expect(createDocsRewriteUrl(url("/docs/guides/auth"))).toBeNull();
  });

  it("keeps the visitor on this host — a rewrite target, never a redirect", () => {
    // The distinction this whole change turns on. The proxy rewrites to the
    // upstream, so the address bar keeps saying /docs; if this ever produced a
    // URL the browser was sent to, the subdomain design would be back in
    // everything but name.
    const target = createDocsRewriteUrl(url("/docs/guides/auth"));
    expect(target?.host).toBe(new URL(UPSTREAM).host);
    expect(target?.host).not.toBe(new URL(SITE).host);
  });
});

describe("createDocsLocaleRedirectPath", () => {
  it("drops the locale segment for the zone's default language", () => {
    // The zone hides its default locale, so emitting `/docs/en/...` would hand
    // the visitor a URL the zone itself redirects away from.
    expect(createDocsLocaleRedirectPath("/en/docs/cli/create-sailor")).toBe(
      "/docs/cli/create-sailor",
    );
    expect(createDocsLocaleRedirectPath("/en/docs")).toBe("/docs");
  });

  it("folds both Chinese scripts onto the zone's single bilingual locale", () => {
    // The zone runs a narrower axis: i18n.languages = ["en", "zh"]
    // (apps/sailor-docs/src/lib/i18n.ts), so zh-Hans and zh-Hant both land on "zh".
    expect(createDocsLocaleRedirectPath("/zh-Hans/docs/cli/create-sailor")).toBe(
      "/docs/zh/cli/create-sailor",
    );
    expect(createDocsLocaleRedirectPath("/zh-Hant/docs/cli/create-sailor")).toBe(
      "/docs/zh/cli/create-sailor",
    );
  });

  it("falls non-content landing locales back to the zone's default", () => {
    expect(createDocsLocaleRedirectPath("/de/docs/cli/create-sailor")).toBe(
      "/docs/cli/create-sailor",
    );
  });

  it("leaves the legacy bare /zh prefix to the proxy's own 308", () => {
    // Bare `zh` is not a route locale, so this seam must not claim it — it is
    // redirected to /zh-Hans/docs/... first (see legacyLocalePathRedirect).
    expect(createDocsLocaleRedirectPath("/zh/docs/cli/create-sailor")).toBeNull();
  });

  it("claims nothing that is not a locale-prefixed docs path", () => {
    expect(createDocsLocaleRedirectPath("/docs/cli/create-sailor")).toBeNull();
    expect(createDocsLocaleRedirectPath("/en/features")).toBeNull();
    expect(createDocsLocaleRedirectPath("/")).toBeNull();
  });
});
