import {
  getPostBySlug as fetchSanityPostBySlug,
  getPostTranslationByKey as fetchSanityPostTranslationByKey,
  getPosts,
} from "@nebutra/sanity/queries";
import { type BlogPost, FALLBACK_POSTS } from "./blog-fallback";

export type { BlogPost };

export type BlogSource = "sanity" | "fallback";
export type BlogLanguage = "en" | "zh";

export type BlogAuthor = {
  name?: string | null;
  image?: unknown;
  bio?: unknown;
};

export type PortableTextSpan = {
  _type?: "span";
  _key?: string;
  text?: string;
  marks?: string[];
};

export type PortableTextBlock = {
  _type: string;
  _key?: string;
  style?: string;
  listItem?: string;
  level?: number;
  children?: PortableTextSpan[];
  markDefs?: Array<Record<string, unknown>>;
  asset?: { _ref?: string; _type?: string } | null;
  alt?: string | null;
  caption?: string | null;
};

export type BlogPostWithSource = BlogPost & {
  id: string;
  slug: string;
  title: string;
  language: BlogLanguage;
  translationKey?: string;
  excerpt: string;
  description: string;
  date: string;
  updatedAt?: string;
  tags: string[];
  author?: string | BlogAuthor;
  mainImage?: unknown;
  body?: PortableTextBlock[] | null;
  source: BlogSource;
};

type SanityPost = {
  _id?: string;
  _updatedAt?: string;
  title?: string | null;
  slug?: { current?: string | null } | string | null;
  language?: BlogLanguage | string | null;
  translationKey?: string | null;
  publishedAt?: string | null;
  excerpt?: string | null;
  mainImage?: unknown;
  author?: string | BlogAuthor | null;
  categories?: string[] | null;
  body?: PortableTextBlock[] | null;
};

function normalizeSlug(slug: SanityPost["slug"]): string | null {
  if (typeof slug === "string") return slug || null;
  return slug?.current || null;
}

export function toBlogLanguage(locale: string): BlogLanguage {
  return locale === "zh" ? "zh" : "en";
}

function normalizeFallbackPost(post: BlogPost, idx: number): BlogPostWithSource {
  return {
    ...post,
    id: `fallback-${idx}`,
    slug: post.slug,
    title: post.title,
    language: "en",
    excerpt: post.excerpt,
    description: post.excerpt,
    date: post.date,
    tags: [],
    source: "fallback",
  };
}

function normalizeSanityPost(post: SanityPost | null): BlogPostWithSource | null {
  if (!post) return null;
  const slug = normalizeSlug(post.slug);
  if (!slug || !post.title) return null;
  const language = post.language === "zh" ? "zh" : "en";

  const excerpt = post.excerpt ?? "";
  return {
    id: post._id ?? slug,
    slug,
    title: post.title,
    language,
    translationKey: post.translationKey ?? undefined,
    excerpt,
    description: excerpt,
    date: post.publishedAt ?? post._updatedAt ?? new Date(0).toISOString(),
    updatedAt: post._updatedAt,
    tags: post.categories?.filter(Boolean) ?? [],
    author: post.author ?? undefined,
    mainImage: post.mainImage ?? null,
    body: post.body ?? null,
    source: "sanity",
  };
}

function shouldUseFallbackSource(): boolean {
  return process.env.NEXT_PUBLIC_BLOG_SOURCE === "fallback";
}

function getFallbackPosts(): BlogPostWithSource[] {
  return FALLBACK_POSTS.map((post, idx) => normalizeFallbackPost(post, idx));
}

export async function getAllPosts(language: BlogLanguage = "en"): Promise<BlogPostWithSource[]> {
  if (shouldUseFallbackSource()) {
    return getFallbackPosts().filter((post) => post.language === language);
  }

  const posts = (await getPosts(language)) as SanityPost[];
  return posts.map(normalizeSanityPost).filter((post): post is BlogPostWithSource => Boolean(post));
}

export async function getPost(
  slug: string,
  language: BlogLanguage = "en",
): Promise<BlogPostWithSource | null> {
  if (shouldUseFallbackSource()) {
    return (
      getFallbackPosts().find((post) => post.slug === slug && post.language === language) ?? null
    );
  }

  const post = normalizeSanityPost(
    (await fetchSanityPostBySlug(slug, language)) as SanityPost | null,
  );
  return post;
}

export async function getAllSlugs(language: BlogLanguage = "en"): Promise<string[]> {
  const posts = await getAllPosts(language);
  return [...new Set(posts.map((post) => post.slug))];
}

export async function getPostTranslation(
  translationKey: string,
  language: BlogLanguage,
): Promise<BlogPostWithSource | null> {
  if (shouldUseFallbackSource()) return null;

  const post = normalizeSanityPost(
    (await fetchSanityPostTranslationByKey(translationKey, language)) as SanityPost | null,
  );
  return post;
}

export async function getLocalizedPostForSiblingSlug(
  slug: string,
  language: BlogLanguage,
): Promise<BlogPostWithSource | null> {
  const siblingLanguage: BlogLanguage = language === "zh" ? "en" : "zh";
  const siblingPost = await getPost(slug, siblingLanguage);
  if (!siblingPost?.translationKey) return null;

  return getPostTranslation(siblingPost.translationKey, language);
}

export const getPostBySlug = getPost;
