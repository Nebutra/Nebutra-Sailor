import {
  type BlogLanguage,
  type BlogPostWithSource,
  getBlogRelatedPosts,
  getBlogTableOfContents,
  getFallbackBlogCover,
  getPostCopyText,
  oppositeBlogLanguage,
  resolveBlogCover,
  toBlogLanguage,
} from "@nebutra/blog";
import { getImageUrl } from "@nebutra/sanity/image";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { hasLocale } from "next-intl";
import { type Locale, routing } from "@/i18n/routing";
import {
  getAllPosts,
  getLocalizedPostForSiblingSlug,
  getPostBySlug,
  getPostTranslation,
} from "@/lib/blog";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { contentTimestamp } from "@/lib/seo/lastmod";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { localesForPath } from "@/lib/seo/route-registry";
import { getSiteUrl, type PublicationSet, unpublishedSet } from "@/lib/seo/site-routes";
import { buildArticleSchema, buildBreadcrumbListSchema } from "@/lib/seo/structured-data";

export const EMPTY_BLOG_PLACEHOLDER_SLUG = "empty-placeholder-do-not-fetch";

export function localizedPostHref(locale: string, slug?: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return slug ? `${prefix}/blog/${slug}` : `${prefix}/blog`;
}

export function localizedPageHref(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${prefix}${path}`;
}

export function localeForBlogLanguage(language: BlogLanguage): Locale {
  return language === "zh" ? "zh-Hans" : "en";
}

export function getAuthorName(author: BlogPostWithSource["author"]): string | null {
  if (!author) return null;
  return typeof author === "string" ? author : (author.name ?? null);
}

export function getAuthorAvatarUrl(author: BlogPostWithSource["author"]): string | null {
  if (!author || typeof author === "string" || !author.image) return null;
  return getImageUrl(author.image, { width: 96, height: 96, format: "webp" });
}

export async function getCachedBlogPost(
  slug: string,
  language: BlogLanguage,
): Promise<BlogPostWithSource | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  cacheTag(`blog:${slug}`);
  return getPostBySlug(slug, language);
}

export async function getCachedLocalizedPostForSiblingSlug(
  slug: string,
  language: BlogLanguage,
): Promise<BlogPostWithSource | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  cacheTag(`blog:${slug}`);
  return getLocalizedPostForSiblingSlug(slug, language);
}

async function getCachedAllPosts(language: BlogLanguage): Promise<BlogPostWithSource[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  return getAllPosts(language);
}

export async function getCachedPostTranslation(
  translationKey: string,
  language: BlogLanguage,
): Promise<BlogPostWithSource | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  cacheTag(`blog-translation:${translationKey}`);
  return getPostTranslation(translationKey, language);
}

async function blogPublicationSet(post: BlogPostWithSource): Promise<PublicationSet> {
  const selfLocale = localeForBlogLanguage(post.language);
  const pathByLocale: Record<string, `/${string}`> = {
    [selfLocale]: `/blog/${post.slug}`,
  };
  const locales: string[] = [selfLocale];

  if (post.translationKey) {
    const sibling = await getCachedPostTranslation(
      post.translationKey,
      oppositeBlogLanguage(post.language),
    );
    if (sibling) {
      const siblingLocale = localeForBlogLanguage(sibling.language);
      if (!locales.includes(siblingLocale)) locales.push(siblingLocale);
      pathByLocale[siblingLocale] = `/blog/${sibling.slug}`;
    }
  }

  const ordered = localesForPath("/blog/*").filter((locale) => locales.includes(locale));
  const primary = (ordered[0] ?? selfLocale) as string;
  return { path: pathByLocale[primary] as `/${string}`, locales: ordered, pathByLocale };
}

function unpublishedBlogMetadata(lang: string, slug: string): Metadata {
  const locale = hasLocale(routing.locales, lang) ? lang : routing.defaultLocale;
  return buildPageMetadata({
    title: "Not found — Nebutra Blog",
    description: "This article is not published.",
    path: `/blog/${slug}`,
    locale,
    publishedIn: unpublishedSet(`/blog/${slug}`),
  });
}

export async function buildBlogMetadata(lang: string, slug: string): Promise<Metadata> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");

  if (!hasLocale(routing.locales, lang) || slug === EMPTY_BLOG_PLACEHOLDER_SLUG) {
    return unpublishedBlogMetadata(lang, slug);
  }
  cacheTag(`blog:${slug}`);

  const post =
    (await getCachedBlogPost(slug, toBlogLanguage(lang))) ??
    (await getCachedLocalizedPostForSiblingSlug(slug, toBlogLanguage(lang)));
  if (!post) return unpublishedBlogMetadata(lang, slug);

  const ogImage = `${getSiteUrl()}${localizedPostHref(lang, post.slug)}/opengraph-image`;
  const authorName = getAuthorName(post.author);

  return buildPageMetadata({
    title: `${post.title} — Nebutra Blog`,
    description: post.excerpt || post.title,
    path: `/blog/${post.slug}`,
    locale: lang as Locale,
    type: "article",
    image: ogImage,
    publishedIn: await blogPublicationSet(post),
    ...(contentTimestamp(post.date) ? { publishedTime: contentTimestamp(post.date) } : {}),
    ...(contentTimestamp(post.updatedAt) ? { modifiedTime: contentTimestamp(post.updatedAt) } : {}),
    ...(authorName ? { authors: [authorName] } : {}),
  });
}

function formatBlogDate(iso: string | undefined, isZh: boolean): string | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (!Number.isFinite(time) || time <= 0) return null;
  return new Intl.DateTimeFormat(isZh ? "zh-CN" : "en-US", {
    year: "numeric",
    month: isZh ? "numeric" : "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(time);
}

export type CachedBlogArticle =
  | { kind: "not-found" }
  | { kind: "redirect"; href: string }
  | {
      kind: "ok";
      post: BlogPostWithSource;
      blogLanguage: BlogLanguage;
      isZh: boolean;
      date: string | null;
      authorName: string | null;
      authorAvatarUrl: string | null;
      articleCopyText: string;
      tableOfContents: ReturnType<typeof getBlogTableOfContents>;
      canonicalUrl: string;
      footerPosts: BlogPostWithSource[];
      cover: ReturnType<typeof resolveBlogCover>;
      fallbackCover: ReturnType<typeof getFallbackBlogCover>;
      imageUrl: string;
      imageAlt: string;
      translation: BlogPostWithSource | null;
      translationLocale: Locale;
      targetLanguage: BlogLanguage;
      articleLd: ReturnType<typeof buildArticleSchema>;
      breadcrumbLd: ReturnType<typeof buildBreadcrumbListSchema>;
    };

export async function loadCachedBlogArticle(
  lang: string,
  slug: string,
): Promise<CachedBlogArticle> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  cacheTag(`blog:${slug}`);

  if (!hasLocale(routing.locales, lang) || slug === EMPTY_BLOG_PLACEHOLDER_SLUG) {
    return { kind: "not-found" };
  }

  const isZh = isZhUiLocale(lang);
  const blogLanguage = toBlogLanguage(lang);
  let post = await getCachedBlogPost(slug, blogLanguage);
  if (!post) {
    post = await getCachedLocalizedPostForSiblingSlug(slug, blogLanguage);
    if (post?.slug && post.slug !== slug) {
      return { kind: "redirect", href: localizedPostHref(lang, post.slug) };
    }
  }
  if (!post) return { kind: "not-found" };

  const targetLanguage = oppositeBlogLanguage(blogLanguage);
  const translation = post.translationKey
    ? await getCachedPostTranslation(post.translationKey, targetLanguage)
    : null;
  const translationLocale = localeForBlogLanguage(targetLanguage);
  const fallbackCover = getFallbackBlogCover(post);
  const primaryImageUrl = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width: 1200,
        height: 630,
        format: "webp",
      })
    : null;
  const cover = resolveBlogCover(post, { alt: `${post.title} cover`, imageUrl: primaryImageUrl });
  const allPosts = await getCachedAllPosts(blogLanguage);
  const relatedPosts = getBlogRelatedPosts(allPosts, post, 2);
  const footerPosts =
    relatedPosts.length > 0
      ? relatedPosts
      : allPosts.filter((candidate) => candidate.slug !== post.slug).slice(0, 2);
  const canonicalUrl = `${getSiteUrl()}${localizedPostHref(lang, post.slug)}`;
  const authorName = getAuthorName(post.author);
  const datePublished = contentTimestamp(post.date) ?? contentTimestamp(post.updatedAt);
  const dateModified = contentTimestamp(post.updatedAt) ?? contentTimestamp(post.date);

  return {
    kind: "ok",
    post,
    blogLanguage,
    isZh,
    date: formatBlogDate(post.date, isZh),
    authorName,
    authorAvatarUrl: getAuthorAvatarUrl(post.author),
    articleCopyText: getPostCopyText(post),
    tableOfContents: getBlogTableOfContents(post.body),
    canonicalUrl,
    footerPosts,
    cover,
    fallbackCover,
    imageUrl: cover.src,
    imageAlt: cover.alt,
    translation,
    translationLocale,
    targetLanguage,
    articleLd: buildArticleSchema({
      headline: post.title,
      description: post.excerpt || post.title,
      url: canonicalUrl,
      image: cover.src ?? undefined,
      datePublished,
      dateModified,
      author: authorName ? { name: authorName } : undefined,
      publisher: {
        name: "Nebutra",
        logo: `${getSiteUrl()}/icon.png`,
      },
    }),
    breadcrumbLd: buildBreadcrumbListSchema([
      {
        name: "Home",
        url: lang === routing.defaultLocale ? getSiteUrl() : `${getSiteUrl()}/${lang}`,
      },
      { name: "Blog", url: `${getSiteUrl()}${localizedPostHref(lang)}` },
      { name: post.title, url: canonicalUrl },
    ]),
  };
}
