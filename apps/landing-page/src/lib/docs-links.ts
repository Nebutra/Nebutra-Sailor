// docs.nebutra.com (sailor-docs Fumadocs app) is the canonical public docs host
// since 2026-05-15 when it was deployed to ECS. Both constants now resolve to
// the same origin — PUBLIC_* kept for callers that semantically mean "the URL
// a user would share", DOCS_ORIGIN_URL for callers that mean "host the bundle
// is served from". Collapse once no caller distinguishes.
export const PUBLIC_DOCS_BASE_URL = "https://docs.nebutra.com";
export const DOCS_ORIGIN_URL = "https://docs.nebutra.com";

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
