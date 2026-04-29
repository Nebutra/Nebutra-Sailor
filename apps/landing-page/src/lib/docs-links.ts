export const PUBLIC_DOCS_BASE_URL = "https://nebutra.com/docs";
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
