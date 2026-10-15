import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * A slug that is not an article answers 404, and a slug that names the other
 * language's version answers a permanent redirect — both decided before the
 * page or its metadata touch request data. Metadata that reached
 * `connection()` while the page body redirected was a prerender bailout
 * (NEXT_STATIC_GEN_BAILOUT), which Next serves as a 500: that was
 * /zh-Hans/blog/why-we-build-nebutra, whose Chinese version lives at "-zh".
 */

const mocks = vi.hoisted(() => ({
  connection: vi.fn(async () => {}),
  loadCachedBlogArticle: vi.fn(),
  buildBlogMetadata: vi.fn(async () => ({ title: "article" })),
}));

vi.mock("next/server", () => ({ connection: mocks.connection }));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  permanentRedirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:308:${href}`);
  }),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  setRequestLocale: vi.fn(),
}));

vi.mock("@/lib/blog-page-cache", () => ({
  EMPTY_BLOG_PLACEHOLDER_SLUG: "empty-placeholder-do-not-fetch",
  buildBlogMetadata: mocks.buildBlogMetadata,
  loadCachedBlogArticle: mocks.loadCachedBlogArticle,
  localizedPageHref: (locale: string, path: string) => `/${locale}${path}`,
  localizedPostHref: (locale: string, slug?: string) => `/${locale}/blog/${slug ?? ""}`,
}));

// The article's UI is not under test: stub the component modules so the
// route's decision logic loads without the design system's client graph.
const { Stub } = vi.hoisted(() => ({ Stub: () => null }));
vi.mock("@nebutra/ui/components", () => ({ AnimateIn: Stub }));
vi.mock("@nebutra/ui/primitives", () => ({ DynamicIslandTOC: Stub }));
vi.mock("@/components/landing", () => ({ NewsletterForm: Stub }));
vi.mock("@/components/landing/blog-author-avatar", () => ({ BlogAuthorAvatar: Stub }));
vi.mock("@/components/landing/blog-comments", () => ({ BlogComments: Stub }));
vi.mock("@/components/landing/blog-copy-button", () => ({ BlogCopyButton: Stub }));
vi.mock("@/components/landing/blog-image", () => ({ BlogImage: Stub }));
vi.mock("@/components/landing/blog-portable-text", () => ({ BlogPortableText: Stub }));
vi.mock("@/components/landing/blog-share-actions", () => ({ BlogShareActions: Stub }));
vi.mock("@/components/seo/structured-data", () => ({ StructuredData: Stub }));

import { notFound, permanentRedirect } from "next/navigation";
import BlogPostPage, { generateMetadata } from "../page";

type Params = { lang: string; slug: string };

async function renderPage(params: Params) {
  // The page returns <BlogPostLoader params={…} />; call that component the
  // way React would, so its notFound()/redirect decision runs.
  const element = (await BlogPostPage({ params: Promise.resolve(params) })) as ReactElement<{
    params: Promise<Params>;
  }>;
  const Loader = element.type as (props: { params: Promise<Params> }) => Promise<unknown>;
  return Loader(element.props);
}

describe("/blog/[slug] — missing and moved posts", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("answers 404 for a slug with no article, without touching request data", async () => {
    mocks.loadCachedBlogArticle.mockResolvedValue({ kind: "not-found" });

    await expect(renderPage({ lang: "en", slug: "no-such-post" })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFound).toHaveBeenCalled();

    const metadata = await generateMetadata({
      params: Promise.resolve({ lang: "en", slug: "no-such-post" }),
    });
    expect(metadata.robots).toMatchObject({ index: false });
    expect(mocks.connection).not.toHaveBeenCalled();
    expect(mocks.buildBlogMetadata).not.toHaveBeenCalled();
  });

  it("permanently redirects a Chinese request for the English slug to the -zh slug", async () => {
    mocks.loadCachedBlogArticle.mockResolvedValue({
      kind: "redirect",
      href: "/zh-Hans/blog/why-we-build-nebutra-zh",
    });

    await expect(renderPage({ lang: "zh-Hans", slug: "why-we-build-nebutra" })).rejects.toThrow(
      "NEXT_REDIRECT:308:/zh-Hans/blog/why-we-build-nebutra-zh",
    );
    expect(permanentRedirect).toHaveBeenCalledWith("/zh-Hans/blog/why-we-build-nebutra-zh");
  });

  it("keeps a redirecting slug's metadata off request data (the 500)", async () => {
    mocks.loadCachedBlogArticle.mockResolvedValue({
      kind: "redirect",
      href: "/blog/why-we-build-nebutra",
    });

    await generateMetadata({
      params: Promise.resolve({ lang: "en", slug: "why-we-build-nebutra-zh" }),
    });
    expect(mocks.connection).not.toHaveBeenCalled();
    expect(mocks.buildBlogMetadata).not.toHaveBeenCalled();
  });

  it("builds an article's metadata at request time", async () => {
    mocks.loadCachedBlogArticle.mockResolvedValue({ kind: "ok" });

    const metadata = await generateMetadata({
      params: Promise.resolve({ lang: "en", slug: "why-we-build-nebutra" }),
    });
    expect(mocks.connection).toHaveBeenCalledTimes(1);
    expect(metadata).toEqual({ title: "article" });
  });
});
