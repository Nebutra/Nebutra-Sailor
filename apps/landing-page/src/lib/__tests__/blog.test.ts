import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Sanity module so it doesn't try to connect
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
    // Reset env for each test
    process.env = { ...originalEnv };
    // Ensure MDX source is used by default
    delete process.env.NEXT_PUBLIC_BLOG_SOURCE;
    // Set cwd to the landing-page root so content/blog resolves correctly
    vi.spyOn(process, "cwd").mockReturnValue(path.resolve(__dirname, "../../../"));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe("getAllPosts", () => {
    it("returns MDX posts sorted by date descending", async () => {
      const { getAllPosts } = await import("@/lib/blog");
      const posts = await getAllPosts();

      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);

      // Verify shape of first post
      const post = posts[0];
      expect(post).toHaveProperty("id");
      expect(post).toHaveProperty("slug");
      expect(post).toHaveProperty("title");
      expect(post).toHaveProperty("description");
      expect(post).toHaveProperty("date");
      expect(post).toHaveProperty("tags");
      expect(post).toHaveProperty("source", "mdx");
    });

    it("returns posts with correct hello-world content", async () => {
      const { getAllPosts } = await import("@/lib/blog");
      const posts = await getAllPosts();

      const helloWorld = posts.find((p) => p.slug === "hello-world");
      expect(helloWorld).toBeDefined();
      expect(helloWorld?.title).toBe("Hello World: Introducing the Nebutra Blog");
      expect(helloWorld?.author).toBe("Nebutra Team");
      expect(helloWorld?.tags).toContain("announcement");
      expect(helloWorld?.tags).toContain("engineering");
    });

    it("returns posts sorted by date descending", async () => {
      const { getAllPosts } = await import("@/lib/blog");
      const posts = await getAllPosts();

      for (let i = 1; i < posts.length; i++) {
        const prev = new Date(posts[i - 1].date).getTime();
        const curr = new Date(posts[i].date).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe("getPost", () => {
    it("returns a full post detail for a valid slug", async () => {
      const { getPost } = await import("@/lib/blog");
      const post = await getPost("hello-world");

      expect(post).not.toBeNull();
      expect(post?.slug).toBe("hello-world");
      expect(post?.title).toBe("Hello World: Introducing the Nebutra Blog");
      expect(post?.content).toBeDefined();
      expect(typeof post?.content).toBe("string");
      expect(post?.content?.length).toBeGreaterThan(0);
      expect(post?.source).toBe("mdx");
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
      expect(slugs).toContain("hello-world");
    });

    it("returns deduplicated slugs", async () => {
      const { getAllSlugs } = await import("@/lib/blog");
      const slugs = await getAllSlugs();
      const unique = [...new Set(slugs)];

      expect(slugs.length).toBe(unique.length);
    });
  });

  describe("source selection", () => {
    it("defaults to mdx when NEXT_PUBLIC_BLOG_SOURCE is not set", async () => {
      delete process.env.NEXT_PUBLIC_BLOG_SOURCE;
      const { getAllPosts } = await import("@/lib/blog");
      const posts = await getAllPosts();

      // All posts should be from mdx since sanity is mocked to return []
      for (const post of posts) {
        expect(post.source).toBe("mdx");
      }
    });

    it("respects NEXT_PUBLIC_BLOG_SOURCE=sanity", async () => {
      process.env.NEXT_PUBLIC_BLOG_SOURCE = "sanity";
      const { getAllPosts } = await import("@/lib/blog");
      const posts = await getAllPosts();

      // Sanity is mocked to return [] so no posts
      expect(posts).toHaveLength(0);
    });
  });
});
