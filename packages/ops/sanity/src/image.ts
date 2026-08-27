import type { SanityImageSource } from "@sanity/image-url";
import { createImageUrlBuilder } from "@sanity/image-url";
import { client } from "./client";

const builder = createImageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

/**
 * Get optimized image URL with default settings
 */
export function getImageUrl(
  source: SanityImageSource,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "webp" | "jpg" | "png";
  },
) {
  let img = builder.image(source).auto("format");

  if (options?.width) {
    img = img.width(options.width);
  }
  if (options?.height) {
    img = img.height(options.height);
  }
  if (options?.quality) {
    img = img.quality(options.quality);
  }
  if (options?.format) {
    img = img.format(options.format);
  }

  return img.url();
}

/** `image-<hash>-<width>x<height>-<ext>` — the ref carries the intrinsic size. */
const ASSET_REF_DIMENSIONS = /-(\d+)x(\d+)-[a-z]+$/;

function assetRefOf(source: SanityImageSource): string | null {
  if (typeof source === "string") return source;
  if (typeof source !== "object" || source === null) return null;

  if ("_ref" in source && typeof source._ref === "string") return source._ref;
  if ("asset" in source && source.asset && typeof source.asset === "object") {
    const asset = source.asset as { _ref?: unknown; _id?: unknown };
    if (typeof asset._ref === "string") return asset._ref;
    if (typeof asset._id === "string") return asset._id;
  }
  return null;
}

/**
 * Intrinsic pixel size of a Sanity image, or `null` when the ref is unreadable.
 *
 * Renderers need the real ratio. `next/image` writes `width`/`height` onto the
 * tag, and the UA stylesheet turns those into `aspect-ratio` — so a hardcoded
 * pair makes the browser lay out a box of the wrong shape and `object-cover`
 * quietly crops whatever does not fit.
 */
export function getImageDimensions(
  source: SanityImageSource,
): { width: number; height: number } | null {
  const match = assetRefOf(source)?.match(ASSET_REF_DIMENSIONS);
  if (!match) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}
