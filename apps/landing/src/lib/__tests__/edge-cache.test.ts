import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import {
  applyEdgeCacheHeaders,
  BROWSER_CACHE_CONTROL,
  EDGE_CACHE_CONTROL,
  EDGE_NO_STORE,
  edgeCacheHeaderRules,
  isEdgeCachedPath,
} from "../edge-cache";

const locales = routing.locales;

function headersFor(
  pathname: string,
  {
    method = "GET",
    response = new Response(null, { status: 200 }),
  }: { method?: string; response?: Response } = {},
) {
  applyEdgeCacheHeaders(response, { method, pathname }, locales);
  return {
    browser: response.headers.get("cache-control"),
    edge: response.headers.get("cloudflare-cdn-cache-control"),
  };
}

describe("edge cache headers", () => {
  it("public prerendered pages, in any locale, are browser-revalidated (edge lifetime from next.config)", () => {
    for (const path of ["/", "/investors", "/zh-Hans", "/zh-Hans/investors", "/de/about/global"]) {
      expect(headersFor(path), path).toEqual({ browser: BROWSER_CACHE_CONTROL, edge: null });
    }
    expect(BROWSER_CACHE_CONTROL).toBe("public, max-age=0, must-revalidate");
    expect(EDGE_CACHE_CONTROL).toBe(
      "max-age=600, stale-while-revalidate=86400, stale-if-error=86400",
    );
  });

  it("pages rendered per request, unknown paths and dynamic routes are never edge-cached", () => {
    for (const path of [
      "/pricing",
      "/zh-Hans/pricing",
      "/licensing",
      "/get-license",
      "/refer",
      "/status",
      "/blog/some-essay",
      "/workspace",
      "/nope",
      "/investors/x",
    ]) {
      expect(headersFor(path), path).toEqual({ browser: null, edge: EDGE_NO_STORE });
    }
  });

  it("writes, redirects and responses with a cookie are never edge-cached", () => {
    expect(headersFor("/investors", { method: "POST" }).edge).toBe(EDGE_NO_STORE);
    const redirect = new Response(null, { status: 307, headers: { location: "/x" } });
    expect(headersFor("/en/investors", { response: redirect }).edge).toBe(EDGE_NO_STORE);
    const cookie = new Response(null, { status: 200, headers: { "set-cookie": "a=1; Path=/" } });
    expect(headersFor("/investors", { response: cookie })).toEqual({
      browser: null,
      edge: EDGE_NO_STORE,
    });
  });

  it("next.config gives listed pages their edge lifetime for document requests only", () => {
    const rules = edgeCacheHeaderRules(locales);
    const home = rules.find((r) => r.source === `/:edgeLocale(${locales.join("|")})?`);
    const investors = rules.find((r) => r.source.endsWith(")?/investors"));
    expect(home).toBeDefined();
    expect(investors?.headers).toEqual([
      { key: "Cloudflare-CDN-Cache-Control", value: EDGE_CACHE_CONTROL },
    ]);
    // Next strips these before the proxy runs; only a config rule can see them.
    expect(investors?.missing).toEqual(
      expect.arrayContaining([
        { type: "header", key: "rsc" },
        { type: "header", key: "next-router-prefetch" },
        { type: "query", key: "_rsc" },
      ]),
    );
    expect(rules.some((r) => r.source.endsWith("/pricing"))).toBe(false);
  });

  it("strips the locale prefix only for real route locales", () => {
    expect(isEdgeCachedPath("/ja", locales)).toBe(true);
    expect(isEdgeCachedPath("/xx/investors", locales)).toBe(false);
  });
});
