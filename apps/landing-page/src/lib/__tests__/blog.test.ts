import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the blog data layer stub.
 *
 * Note: The full MDX + Sanity dual-track loader was in flight on another branch
 * but never landed. The current `@/lib/blog` returns a static FALLBACK_POSTS list
 * (source: "fallback"). When the real loader lands, these tests should be
 * expanded to cover MDX file reads and Sanity CMS source selection.
 */

vi.mock("@nebutra/sanity/image", () => ({
  getImageUrl: () => "https://cdn.sanity.io/mock.webp",
}));

vi.mock("@nebutra/sanity/queries", () => ({
  getPosts: () => Promise.resolve([]),
  getPostBySlug: () => Promise.resolve(null),
}));

describe("blog lib", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_BLOG_SOURCE;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe("getAllPosts", () => {
    it("returns an array of posts with the expected shape", async () => {
      const { getAllPosts } = await import("@/lib/blog");
      const posts = await getAllPosts();

      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);

      const post = posts[0];
      expect(post).toHaveProperty("id");
      expect(post).toHaveProperty("slug");
      expect(post).toHaveProperty("title");
      expect(post).toHaveProperty("description");
      expect(post).toHaveProperty("date");
      expect(post).toHaveProperty("tags");
      expect(post).toHaveProperty("source");
      expect(["mdx", "sanity", "fallback"]).toContain(post.source);
    });

    it("returns posts with valid ISO date strings", async () => {
      const { getAllPosts } = await import("@/lib/blog");
      const posts = await getAllPosts();

      for (const post of posts) {
        expect(Number.isNaN(new Date(post.date).getTime())).toBe(false);
      }
    });
  });

  describe("getPost", () => {
    it("returns a post for a valid slug from the fallback list", async () => {
      const { getAllPosts, getPost } = await import("@/lib/blog");
      const posts = await getAllPosts();
      const firstSlug = posts[0]?.slug;
      expect(firstSlug).toBeDefined();

      const post = await getPost(firstSlug!);
      expect(post).not.toBeNull();
      expect(post?.slug).toBe(firstSlug);
      expect(post?.title).toBeDefined();
    });

    it("returns null for a non-existent slug", async () => {
      const { getPost } = await import("@/lib/blog");
      const post = await getPost("non-existent-post-slug-12345");
      expect(post).toBeNull();
    });
  });

  describe("getAllSlugs", () => {
    it("returns an array of slug strings", async () => {
      const { getAllSlugs } = await import("@/lib/blog");
      const slugs = await getAllSlugs();

      expect(Array.isArray(slugs)).toBe(true);
      expect(slugs.length).toBeGreaterThan(0);
      for (const slug of slugs) {
        expect(typeof slug).toBe("string");
        expect(slug.length).toBeGreaterThan(0);
      }
    });

    it("returns deduplicated slugs", async () => {
      const { getAllSlugs } = await import("@/lib/blog");
      const slugs = await getAllSlugs();
      const unique = [...new Set(slugs)];
      expect(slugs.length).toBe(unique.length);
    });
  });

  describe("getPostBySlug back-compat alias", () => {
    it("is identical to getPost", async () => {
      const blog = await import("@/lib/blog");
      expect(blog.getPostBySlug).toBe(blog.getPost);
    });
  });
});
