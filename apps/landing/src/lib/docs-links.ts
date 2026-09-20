import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";

// Docs are a path on the site that documents the product, not a host. There is
// no brand.domains.docs any more: one value cannot express "each product serves
// its own docs", and a shared docs subdomain meant a product's own host was
// never where its documentation lived.
//
// Both constants remain because callers mean different things — PUBLIC_* is
// "the URL a person would share", DOCS_ORIGIN_URL is "where the bundle is
// served from". They coincide today; the rewrite upstream lives in
// docs-routing.ts and is deliberately not exported here, so nothing can start
// linking people at the Fly app directly.
const DOCS_PATH = "/docs";
export const PUBLIC_DOCS_BASE_URL = `${getBrandOrigin("landing")}${DOCS_PATH}`;
export const DOCS_ORIGIN_URL = PUBLIC_DOCS_BASE_URL;

function normalizeDocsPath(path = ""): string {
  const normalized = path.trim().replace(/^\/+/, "").replace(/\/+$/, "");

  if (!normalized || normalized === "docs") {
    return "";
  }

  if (normalized.startsWith("docs/")) {
    return `/${normalized.slice("docs/".length)}`;
  }

  return `/${normalized}`;
}

export function createPublicDocsUrl(path?: string): string {
  return `${PUBLIC_DOCS_BASE_URL}${normalizeDocsPath(path)}`;
}

export function createDocsOriginUrl(path?: string): string {
  return `${DOCS_ORIGIN_URL}${normalizeDocsPath(path)}`;
}
