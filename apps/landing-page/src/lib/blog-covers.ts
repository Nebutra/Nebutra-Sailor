import type { BlogPostWithSource } from "./blog";

type BlogCover = {
  alt: string;
  src: string;
};

const DEFAULT_COVER = "/images/blog/covers/nebutra-default.png";

const COVER_BY_KEY: Record<string, string> = {
  "nebutra-sailor-why-exists": "/images/blog/covers/nebutra-sailor-exists.png",
  "why-nebutra-sailor-exists": "/images/blog/covers/nebutra-sailor-exists.png",
  "why-we-build-nebutra": "/images/blog/covers/why-we-build-nebutra.png",
};

const COVER_BY_SLUG: Record<string, string> = {
  "why-nebutra-sailor-exists": "/images/blog/covers/nebutra-sailor-exists.png",
  "why-nebutra-sailor-exists-zh": "/images/blog/covers/nebutra-sailor-exists.png",
  "why-we-build-nebutra": "/images/blog/covers/why-we-build-nebutra.png",
  "why-we-build-nebutra-zh": "/images/blog/covers/why-we-build-nebutra.png",
};

export function getFallbackBlogCover(post: BlogPostWithSource): BlogCover {
  return {
    alt: `${post.title} cover`,
    src:
      (post.translationKey ? COVER_BY_KEY[post.translationKey] : undefined) ??
      COVER_BY_SLUG[post.slug] ??
      DEFAULT_COVER,
  };
}
