import "server-only";

/**
 * Resolve a public CDN-style URL from a storage key.
 *
 * If `UPLOADS_PUBLIC_BASE_URL` is configured, the key is prefixed with it;
 * otherwise the key is routed through `/api/uploads/[key]` (proxy path).
 *
 * This function is extracted here to avoid duplicating the same logic across
 * the logo/route.ts (POST/DELETE) and the logo-url/route.ts (GET) handlers.
 */
export function resolveLogoUrl(key: string): string {
  const baseUrl = process.env.UPLOADS_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (baseUrl) return `${baseUrl}/${key}`;
  return `/api/uploads/${encodeURIComponent(key)}`;
}
