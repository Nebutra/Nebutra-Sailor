import {
  type BlogAuthor,
  type BlogLanguage,
  type BlogPostWithSource,
  type PortableTextBlock,
  toBlogLanguage,
} from "@nebutra/blog";
import {
  getPostBySlug as fetchSanityPostBySlug,
  getPostTranslationByKey as fetchSanityPostTranslationByKey,
  getPosts,
} from "@nebutra/sanity/queries";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { type BlogPost, FALLBACK_POSTS } from "./blog-fallback";

export type { PortableTextBlock, PortableTextSpan } from "@nebutra/blog";
export type { BlogPost } from "./blog-fallback";
export { type BlogLanguage, type BlogPostWithSource, toBlogLanguage };

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

function isRecoverableCmsError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === "fetch failed") return true;
  if (!error || typeof error !== "object") return false;

  const maybeError = error as {
    code?: unknown;
    isNetworkError?: unknown;
    cause?: { code?: unknown } | null;
  };

  return (
    maybeError.isNetworkError === true ||
    maybeError.code === "ECONNRESET" ||
    maybeError.cause?.code === "ECONNRESET"
  );
}

export async function getAllPosts(language: BlogLanguage = "en"): Promise<BlogPostWithSource[]> {
  if (shouldUseFallbackSource()) {
    return getFallbackPosts().filter((post) => post.language === language);
  }

  let posts: SanityPost[];
  try {
    posts = (await getPosts(language)) as SanityPost[];
  } catch (error) {
    if (isRecoverableCmsError(error)) return [];
    throw error;
  }

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

  let post: BlogPostWithSource | null;
  try {
    post = normalizeSanityPost((await fetchSanityPostBySlug(slug, language)) as SanityPost | null);
  } catch (error) {
    if (isRecoverableCmsError(error)) return null;
    throw error;
  }

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

  let post: BlogPostWithSource | null;
  try {
    post = normalizeSanityPost(
      (await fetchSanityPostTranslationByKey(translationKey, language)) as SanityPost | null,
    );
  } catch (error) {
    if (isRecoverableCmsError(error)) return null;
    throw error;
  }

  return post;
}

export async function getLocalizedPostForSiblingSlug(
  slug: string,
  language: BlogLanguage,
): Promise<BlogPostWithSource | null> {
  const siblingLanguage: BlogLanguage = isZhUiLocale(language) ? "en" : "zh";
  const siblingPost = await getPost(slug, siblingLanguage);
  if (!siblingPost?.translationKey) return null;

  return getPostTranslation(siblingPost.translationKey, language);
}

export const getPostBySlug = getPost;
