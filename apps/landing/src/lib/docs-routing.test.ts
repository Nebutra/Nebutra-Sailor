import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPublicDocsUrl } from "./docs-links";
import { createDocsRewriteUrl } from "./docs-routing";

const SITE = getBrandOrigin("landing");

function url(path: string): URL {
  return new URL(`${SITE}${path}`);
}

/**
 * A stand-in origin, not the real one. The upstream is deployment config
 * (DOCS_UPSTREAM_ORIGIN, emitted from brand.domains.docsOrigin), so naming the
 * instance's Fly app here would put a brand literal in template code — and
 * would stop testing the seam that makes the origin configurable at all.
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

  it("rewrites the docs entrypoint to the explicit English docs root", () => {
    // The locale prefix is always emitted so the upstream never answers with a
    // redirect of its own — sailor-docs 301s "/" → "/en".
    expect(createDocsRewriteUrl(url("/docs"))?.toString()).toBe(`${UPSTREAM}/en`);
    expect(
      createDocsRewriteUrl(url("/docs/getting-started/installation?utm=npm"))?.toString(),
    ).toBe(`${UPSTREAM}/en/getting-started/installation?utm=npm`);
  });

  it("folds both Chinese scripts onto the docs bundle's single bilingual locale", () => {
    // The bundle runs a narrower axis: i18n.languages = ["en", "zh"]
    // (apps/sailor-docs/src/lib/i18n.ts), so zh-Hans and zh-Hant both land on "zh".
    expect(createDocsRewriteUrl(url("/zh-Hans/docs/cli/create-sailor"))?.toString()).toBe(
      `${UPSTREAM}/zh/cli/create-sailor`,
    );
    expect(createDocsRewriteUrl(url("/zh-Hant/docs/cli/create-sailor"))?.toString()).toBe(
      `${UPSTREAM}/zh/cli/create-sailor`,
    );
  });

  it("falls non-content landing locales back to the English docs path", () => {
    expect(createDocsRewriteUrl(url("/de/docs/cli/create-sailor"))?.toString()).toBe(
      `${UPSTREAM}/en/cli/create-sailor`,
    );
    expect(createDocsRewriteUrl(url("/en/docs/cli/create-sailor"))?.toString()).toBe(
      `${UPSTREAM}/en/cli/create-sailor`,
    );
  });

  it("leaves the legacy bare /zh prefix to the proxy's 308", () => {
    // Bare `zh` is not a route locale, so this seam must not claim it — it is
    // redirected to /zh-Hans/docs/... first (see legacyLocalePathRedirect).
    expect(createDocsRewriteUrl(url("/zh/docs/cli/create-sailor"))).toBeNull();
  });

  it("claims nothing outside /docs", () => {
    expect(createDocsRewriteUrl(url("/features"))).toBeNull();
    expect(createDocsRewriteUrl(url("/"))).toBeNull();
    // A path that merely starts with the same letters is not documentation.
    expect(createDocsRewriteUrl(url("/docsearch"))).toBeNull();
  });

  it("turns /docs into an ordinary 404 when no upstream is configured", () => {
    // The origin is deployment config, so a deployment that does not host docs
    // must get a 404 from the app rather than a rewrite to nowhere.
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
    expect(target?.pathname).toBe("/en/guides/auth");
  });
});
