import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import type { BlogPostWithSource, ResolvedBlogCover } from "./types";

export type BlogCover = {
  alt: string;
  src: string;
};

function landingCoverSrc(file: string): string {
  const origin = (
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    getBrandOrigin("cdn")
  ).replace(/\/+$/, "");
  return `${origin}/landing/images/blog/covers/${file}`;
}

export const DEFAULT_BLOG_COVER = landingCoverSrc("nebutra-default.png");

export const BLOG_COVER_BY_TRANSLATION_KEY: Record<string, string> = {
  "nebutra-sailor-why-exists": landingCoverSrc("nebutra-sailor-exists.png"),
  "why-nebutra-sailor-exists": landingCoverSrc("nebutra-sailor-exists.png"),
  "why-we-build-nebutra": landingCoverSrc("why-we-build-nebutra.png"),
  "founder-top-design-nine-layers": landingCoverSrc("founder-top-design-nine-layers.png"),
};

export const BLOG_COVER_BY_SLUG: Record<string, string> = {
  "why-nebutra-sailor-exists": landingCoverSrc("nebutra-sailor-exists.png"),
  "why-nebutra-sailor-exists-zh": landingCoverSrc("nebutra-sailor-exists.png"),
  "why-we-build-nebutra": landingCoverSrc("why-we-build-nebutra.png"),
  "why-we-build-nebutra-zh": landingCoverSrc("why-we-build-nebutra.png"),
  "founder-top-design-nine-layers": landingCoverSrc("founder-top-design-nine-layers.png"),
  "founder-top-design-nine-layers-zh": landingCoverSrc("founder-top-design-nine-layers.png"),
};

export function getFallbackBlogCover(
  post: Pick<BlogPostWithSource, "slug" | "title"> & {
    translationKey?: string;
  },
): BlogCover {
  return {
    alt: `${post.title} cover`,
    src:
      (post.translationKey ? BLOG_COVER_BY_TRANSLATION_KEY[post.translationKey] : undefined) ??
      BLOG_COVER_BY_SLUG[post.slug] ??
      DEFAULT_BLOG_COVER,
  };
}

function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getBlogImagePlaceholder(seed: string): string {
  const hash = hashSeed(seed);
  const hue = hash % 360;
  const secondaryHue = (hue + 42) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="18" viewBox="0 0 32 18"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="hsl(${hue} 42% 88%)"/><stop offset="1" stop-color="hsl(${secondaryHue} 48% 78%)"/></linearGradient></defs><rect width="32" height="18" fill="url(#g)"/></svg>`;
  return encodeSvg(svg);
}

export function isUsableBlogImageUrl(src: string | null | undefined): src is string {
  const value = src?.trim();
  if (!value) return false;
  return value.startsWith("/") || /^https?:\/\//.test(value);
}

export function resolveBlogCover(
  post: Pick<BlogPostWithSource, "slug" | "title" | "source"> & {
    translationKey?: string;
  },
  options: { alt?: string | null; imageUrl?: string | null } = {},
): ResolvedBlogCover {
  const fallback = getFallbackBlogCover(post);
  const primarySrc = options.imageUrl?.trim();
  const hasPrimary = isUsableBlogImageUrl(primarySrc);
  const alt = options.alt?.trim() || fallback.alt;
  const src = hasPrimary ? primarySrc : fallback.src;

  return {
    alt,
    blurDataURL: getBlogImagePlaceholder(`${post.translationKey ?? post.slug}:${post.title}`),
    fallbackAlt: fallback.alt,
    fallbackSrc: fallback.src,
    src,
    source: hasPrimary ? "sanity" : "fallback",
  };
}
