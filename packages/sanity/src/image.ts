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
