import { glass } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";

/**
 * Deterministic DiceBear "glass" fallback avatar for users without an uploaded
 * image. Seeded by email (preferred) or name so a given identity always renders
 * the same avatar — never letter initials.
 *
 * Generated locally and returned as an SVG `data:` URI: no network request (the
 * email seed never leaves the app), no external dependency/rate-limits, and it
 * satisfies the app CSP (`img-src 'self' data:`). Render with a native `<img>`.
 */
export function dicebearAvatarUrl(seed: string | null | undefined): string {
  const normalized = (seed ?? "").trim().toLowerCase() || "nebutra";
  return createAvatar(glass, { seed: normalized }).toDataUri();
}
