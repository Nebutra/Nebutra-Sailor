import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * /blog/tag/[tag] and /blog/author/[author] with no posts are not pages: they
 * answer 404 instead of an empty list served as 200 (a soft 404). Each also
 * exports generateStaticParams, so its param is known to the prerender and the
 * 404 is decided before the layout shell is committed as a 200.
 */

const mocks = vi.hoisted(() => ({ getAllPosts: vi.fn() }));
const { Stub } = vi.hoisted(() => ({ Stub: () => null }));

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  setRequestLocale: vi.fn(),
}));
vi.mock("@nebutra/sanity/image", () => ({ getImageUrl: () => "https://cdn.sanity.io/mock.webp" }));
vi.mock("@nebutra/ui/components", () => ({ AnimateIn: Stub }));
vi.mock("@/components/landing/blog-index-explorer", () => ({ BlogIndexExplorer: Stub }));
vi.mock("@/lib/blog", () => ({ getAllPosts: mocks.getAllPosts }));

import BlogAuthorPage, {
  generateStaticParams as authorStaticParams,
} from "../author/[author]/page";
import BlogTagPage, { generateStaticParams as tagStaticParams } from "../tag/[tag]/page";

const post = {
  id: "p1",
  slug: "why-we-build-nebutra",
  title: "Why we build Nebutra",
  excerpt: "",
  tags: ["Founder Notes"],
  author: "Tseka Luk",
  body: [],
  language: "en",
  source: "sanity",
};

async function run<P>(page: (props: { params: Promise<P> }) => unknown, params: P) {
  const element = page({ params: Promise.resolve(params) }) as ReactElement<{
    params: Promise<P>;
  }>;
  const Loader = element.type as (props: { params: Promise<P> }) => Promise<unknown>;
  return Loader(element.props);
}

describe("blog facets", () => {
  afterEach(() => vi.clearAllMocks());

  it("answers 404 for a tag no post carries", async () => {
    mocks.getAllPosts.mockResolvedValue([post]);
    await expect(run(BlogTagPage, { lang: "en", tag: "no-such-tag" })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("renders a tag a post carries", async () => {
    mocks.getAllPosts.mockResolvedValue([post]);
    await expect(run(BlogTagPage, { lang: "en", tag: "founder-notes" })).resolves.toBeTruthy();
  });

  it("answers 404 for an author with no posts", async () => {
    mocks.getAllPosts.mockResolvedValue([post]);
    await expect(run(BlogAuthorPage, { lang: "en", author: "nobody" })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("renders an author with posts", async () => {
    mocks.getAllPosts.mockResolvedValue([post]);
    await expect(run(BlogAuthorPage, { lang: "en", author: "tseka-luk" })).resolves.toBeTruthy();
  });

  it("gives the prerender one known param per facet", () => {
    expect(tagStaticParams()).toHaveLength(1);
    expect(authorStaticParams()).toHaveLength(1);
  });
});
