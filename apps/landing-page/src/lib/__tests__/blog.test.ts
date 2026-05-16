import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPosts: vi.fn(),
  getPostBySlug: vi.fn(),
  getPostTranslationByKey: vi.fn(),
}));

vi.mock("@nebutra/sanity/image", () => ({
  getImageUrl: () => "https://cdn.sanity.io/mock.webp",
}));

vi.mock("@nebutra/sanity/queries", () => ({
  getPosts: mocks.getPosts,
  getPostBySlug: mocks.getPostBySlug,
  getPostTranslationByKey: mocks.getPostTranslationByKey,
}));

describe("blog lib", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_BLOG_SOURCE;
    mocks.getPosts.mockResolvedValue([]);
    mocks.getPostBySlug.mockResolvedValue(null);
    mocks.getPostTranslationByKey.mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe("getAllPosts", () => {
    it("returns published Sanity posts as the default source", async () => {
      mocks.getPosts.mockResolvedValue([
        {
          _id: "post-1",
          title: "Sanity Launch Notes",
          slug: { current: "sanity-launch-notes" },
          language: "en",
          translationKey: "sanity-launch-notes",
          publishedAt: "2026-04-10T00:00:00.000Z",
          excerpt: "A CMS-backed article.",
          mainImage: { asset: { _ref: "image-ref" } },
          author: "Nebutra Team",
          categories: ["Engineering", "Product"],
        },
      ]);

      const { getAllPosts } = await import("@/lib/blog");
      const posts = await getAllPosts();

      expect(posts).toHaveLength(1);
      expect(posts[0]).toMatchObject({
        id: "post-1",
        slug: "sanity-launch-notes",
        title: "Sanity Launch Notes",
        language: "en",
        translationKey: "sanity-launch-notes",
        excerpt: "A CMS-backed article.",
        description: "A CMS-backed article.",
        date: "2026-04-10T00:00:00.000Z",
        tags: ["Engineering", "Product"],
        author: "Nebutra Team",
        source: "sanity",
      });
      expect(mocks.getPosts).toHaveBeenCalledWith("en");
    });

    it("passes the requested blog language to Sanity", async () => {
      mocks.getPosts.mockResolvedValue([
        {
          _id: "post-zh",
          title: "为什么要做 Nebutra Sailor",
          slug: { current: "why-nebutra-sailor-exists-zh" },
          language: "zh",
          translationKey: "why-nebutra-sailor-exists",
          publishedAt: "2026-05-16T00:00:00.000Z",
          excerpt: "一篇中文文章。",
          categories: ["工程"],
        },
      ]);

      const { getAllPosts } = await import("@/lib/blog");
      const posts = await getAllPosts("zh");

      expect(mocks.getPosts).toHaveBeenCalledWith("zh");
      expect(posts[0]).toMatchObject({
        language: "zh",
        translationKey: "why-nebutra-sailor-exists",
        slug: "why-nebutra-sailor-exists-zh",
      });
    });

    it("does not publish fallback posts unless explicitly requested", async () => {
      const { getAllPosts } = await import("@/lib/blog");
      const posts = await getAllPosts();

      expect(posts).toEqual([]);
    });

    it("keeps fallback posts behind the explicit fallback source switch", async () => {
      process.env.NEXT_PUBLIC_BLOG_SOURCE = "fallback";

      const { getAllPosts } = await import("@/lib/blog");
      const posts = await getAllPosts();

      expect(posts.length).toBeGreaterThan(0);
      expect(posts.every((post) => post.source === "fallback")).toBe(true);
    });
  });

  describe("getPost", () => {
    it("returns a Sanity post for a valid slug", async () => {
      mocks.getPostBySlug.mockResolvedValue({
        _id: "post-2",
        title: "Deep Governance",
        slug: { current: "deep-governance" },
        language: "en",
        publishedAt: "2026-04-11T00:00:00.000Z",
        excerpt: "Making the blog maintainable.",
        body: [{ _type: "block", _key: "a", children: [{ _type: "span", text: "Body" }] }],
        mainImage: null,
        author: { name: "Tseka" },
        categories: ["Engineering"],
      });

      const { getPost } = await import("@/lib/blog");

      const post = await getPost("deep-governance");
      expect(post).not.toBeNull();
      expect(post).toMatchObject({
        id: "post-2",
        slug: "deep-governance",
        title: "Deep Governance",
        source: "sanity",
      });
      expect(mocks.getPostBySlug).toHaveBeenCalledWith("deep-governance", "en");
    });

    it("passes language when fetching a specific post", async () => {
      const { getPost } = await import("@/lib/blog");

      await getPost("why-nebutra-sailor-exists-zh", "zh");

      expect(mocks.getPostBySlug).toHaveBeenCalledWith("why-nebutra-sailor-exists-zh", "zh");
    });

    it("returns null for a non-existent slug", async () => {
      const { getPost } = await import("@/lib/blog");
      const post = await getPost("non-existent-post-slug-12345");
      expect(post).toBeNull();
    });
  });

  describe("getAllSlugs", () => {
    it("returns deduplicated Sanity slug strings", async () => {
      mocks.getPosts.mockResolvedValue([
        { _id: "1", title: "One", slug: { current: "one" }, language: "en", publishedAt: null },
        {
          _id: "2",
          title: "One duplicate",
          slug: { current: "one" },
          language: "en",
          publishedAt: null,
        },
        { _id: "3", title: "Two", slug: { current: "two" }, language: "en", publishedAt: null },
      ]);

      const { getAllSlugs } = await import("@/lib/blog");
      const slugs = await getAllSlugs();

      expect(slugs).toEqual(["one", "two"]);
    });
  });

  describe("getPostTranslation", () => {
    it("fetches the sibling localized article by translation key and language", async () => {
      mocks.getPostTranslationByKey.mockResolvedValue({
        _id: "post-zh",
        title: "为什么要做 Nebutra Sailor",
        slug: { current: "why-nebutra-sailor-exists-zh" },
        language: "zh",
        translationKey: "why-nebutra-sailor-exists",
        publishedAt: "2026-05-16T00:00:00.000Z",
        excerpt: "中文版本。",
      });

      const { getPostTranslation } = await import("@/lib/blog");
      const translation = await getPostTranslation("why-nebutra-sailor-exists", "zh");

      expect(mocks.getPostTranslationByKey).toHaveBeenCalledWith("why-nebutra-sailor-exists", "zh");
      expect(translation).toMatchObject({
        language: "zh",
        slug: "why-nebutra-sailor-exists-zh",
      });
    });
  });

  describe("getPostBySlug back-compat alias", () => {
    it("is identical to getPost", async () => {
      const blog = await import("@/lib/blog");
      expect(blog.getPostBySlug).toBe(blog.getPost);
    });
  });
});
