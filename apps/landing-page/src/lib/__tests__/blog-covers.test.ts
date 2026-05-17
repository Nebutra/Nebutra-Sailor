import { describe, expect, it } from "vitest";
import type { BlogPostWithSource } from "@/lib/blog";
import { getFallbackBlogCover } from "@/lib/blog-covers";

function makePost(overrides: Partial<BlogPostWithSource>): BlogPostWithSource {
  return {
    date: "2026-05-16T00:00:00.000Z",
    description: "",
    excerpt: "",
    id: "post",
    language: "en",
    slug: "post",
    source: "sanity",
    tags: [],
    title: "Post",
    ...overrides,
  };
}

describe("getFallbackBlogCover", () => {
  it("uses the curated Nebutra Sailor cover for translated sibling slugs", () => {
    expect(
      getFallbackBlogCover(
        makePost({
          slug: "why-nebutra-sailor-exists-zh",
          title: "为什么要做 Nebutra Sailor",
        }),
      ),
    ).toMatchObject({
      alt: "为什么要做 Nebutra Sailor cover",
      src: "/images/blog/covers/nebutra-sailor-exists.png",
    });
  });

  it("uses the generated Nebutra manifesto cover for both localized slugs", () => {
    expect(
      getFallbackBlogCover(
        makePost({
          slug: "why-we-build-nebutra-zh",
          title: "为什么我们要做 Nebutra",
          translationKey: "why-we-build-nebutra",
        }),
      ),
    ).toMatchObject({
      alt: "为什么我们要做 Nebutra cover",
      src: "/images/blog/covers/why-we-build-nebutra.png",
    });
  });

  it("falls back to the generic Nebutra cover for unmapped posts", () => {
    expect(getFallbackBlogCover(makePost({ slug: "new-post" })).src).toBe(
      "/images/blog/covers/nebutra-default.png",
    );
  });
});
