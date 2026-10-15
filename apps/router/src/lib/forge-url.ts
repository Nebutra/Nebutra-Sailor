import { brand } from "@nebutra/brand/metadata";

/**
 * Forge's public origin. Every Router link into Forge goes through this, so a
 * missing env var resolves to the production host, never to a dev port —
 * `http://localhost:3105` shipped to router.nebutra.com from four call sites.
 */
export const FORGE_ORIGIN = (
  process.env.NEXT_PUBLIC_FORGE_URL?.trim() || `https://${brand.domains.forge}`
).replace(/\/+$/, "");

export function forgeHref(path = "/"): string {
  return `${FORGE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}
