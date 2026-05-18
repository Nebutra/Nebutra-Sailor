import { ArrowLeft, BookOpen, Calendar, Clock, Globe } from "@nebutra/icons";
import { getImageUrl } from "@nebutra/sanity/image";
import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import { BlogPortableText } from "@/components/landing/blog-portable-text";
import { type Locale, routing } from "@/i18n/routing";
import {
  type BlogLanguage,
  type BlogPostWithSource,
  getLocalizedPostForSiblingSlug,
  getPostBySlug,
  getPostTranslation,
  toBlogLanguage,
} from "@/lib/blog";
import { getFallbackBlogCover } from "@/lib/blog-covers";

type Params = { lang: string; slug: string };

// Sentinel slug Next emits during static prerender warm-up before any blog
// pages exist; surfacing it to Sanity wastes a fetch + pollutes error logs.
const EMPTY_BLOG_PLACEHOLDER_SLUG = "empty-placeholder-do-not-fetch";

async function buildBlogMetadata(lang: string, slug: string): Promise<Metadata> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");

  if (!hasLocale(routing.locales, lang)) return {};
  if (slug === EMPTY_BLOG_PLACEHOLDER_SLUG) return {};
  cacheTag(`blog:${slug}`);

  const post =
    (await getCachedBlogPost(slug, toBlogLanguage(lang))) ??
    (await getCachedLocalizedPostForSiblingSlug(slug, toBlogLanguage(lang)));
  if (!post) return {};

  const fallbackCover = getFallbackBlogCover(post);
  const ogImage = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width: 1200,
        height: 630,
        format: "webp",
      })
    : `https://nebutra.com${fallbackCover.src}`;

  return {
    title: `${post.title} — Nebutra Blog`,
    description: post.excerpt ?? undefined,
    alternates: { canonical: localizedPostHref(lang, post.slug) },
    openGraph: ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : undefined,
  };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang, slug } = await params;
  return buildBlogMetadata(lang, slug);
}

function getAuthorName(author: BlogPostWithSource["author"]): string | null {
  if (!author) return null;
  return typeof author === "string" ? author : (author.name ?? null);
}

function extractBodyText(post: BlogPostWithSource): string {
  const bodyText =
    post.body
      ?.flatMap((block) => block.children?.map((child) => child.text ?? "") ?? [])
      .join(" ") ?? "";
  return `${post.title} ${post.excerpt} ${bodyText}`.trim();
}

function estimateReadTime(post: BlogPostWithSource, isZh: boolean): string {
  const text = extractBodyText(post);
  const units = isZh ? text.replace(/\s/g, "").length / 420 : text.split(/\s+/).length / 220;
  const minutes = Math.max(2, Math.ceil(units));
  return isZh ? `${minutes} 分钟阅读` : `${minutes} min read`;
}

function localizedPostHref(locale: string, slug?: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return slug ? `${prefix}/blog/${slug}` : `${prefix}/blog`;
}

function languageSwitchPostHref(locale: Locale, slug: string): string {
  return `/${locale}/blog/${slug}`;
}

function oppositeBlogLanguage(language: BlogLanguage): BlogLanguage {
  return language === "zh" ? "en" : "zh";
}

function localeForBlogLanguage(language: BlogLanguage): Locale {
  return language === "zh" ? "zh" : "en";
}

async function getCachedBlogPost(
  slug: string,
  language: BlogLanguage,
): Promise<BlogPostWithSource | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  cacheTag(`blog:${slug}`);
  return getPostBySlug(slug, language);
}

async function getCachedPostTranslation(
  translationKey: string,
  language: BlogLanguage,
): Promise<BlogPostWithSource | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  cacheTag(`blog:translation:${translationKey}`);
  return getPostTranslation(translationKey, language);
}

async function getCachedLocalizedPostForSiblingSlug(
  slug: string,
  language: BlogLanguage,
): Promise<BlogPostWithSource | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  cacheTag(`blog:${slug}`);
  return getLocalizedPostForSiblingSlug(slug, language);
}

export default function BlogPostPage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<BlogPostSkeleton />}>
      <BlogPostLoader params={params} />
    </Suspense>
  );
}

async function BlogPostLoader({ params }: { params: Promise<Params> }) {
  const { lang, slug } = await params;

  if (!hasLocale(routing.locales, lang)) notFound();
  const isZh = lang === "zh";
  setRequestLocale(lang as Locale);

  const blogLanguage = toBlogLanguage(lang);
  let post = await getCachedBlogPost(slug, blogLanguage);
  if (!post) {
    post = await getCachedLocalizedPostForSiblingSlug(slug, blogLanguage);
    if (post?.slug && post.slug !== slug) {
      redirect(localizedPostHref(lang, post.slug));
    }
  }
  if (!post) notFound();
  const targetLanguage = oppositeBlogLanguage(blogLanguage);
  const translation = post.translationKey
    ? await getCachedPostTranslation(post.translationKey, targetLanguage)
    : null;
  const translationLocale = localeForBlogLanguage(targetLanguage);

  const fallbackCover = getFallbackBlogCover(post);
  const imageUrl = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width: 1200,
        height: 630,
        format: "webp",
      })
    : fallbackCover.src;
  const imageAlt = post.mainImage ? post.title : fallbackCover.alt;

  const date = post.date
    ? new Date(post.date).toLocaleDateString(isZh ? "zh-CN" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const authorName = getAuthorName(post.author);

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar />

      <article className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <AnimateIn preset="fade" inView>
          <Link
            href={localizedPostHref(lang)}
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--neutral-11)] hover:text-[var(--blue-9)] transition-colors rounded"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {isZh ? "全部文章" : "All posts"}
          </Link>
        </AnimateIn>

        <header className="border-y border-[var(--neutral-6)] py-10 sm:py-12">
          {post.tags.length > 0 && (
            <AnimateIn preset="fadeUp" inView>
              <div className="mb-5 flex flex-wrap gap-1.5">
                {post.tags.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </AnimateIn>
          )}

          <AnimateIn preset="emerge" inView>
            <div className="grid gap-8 lg:grid-cols-[1fr_260px] lg:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-1 text-xs font-medium text-[var(--neutral-11)]">
                  <BookOpen className="size-3.5" aria-hidden />
                  {isZh ? "Nebutra 技术博客" : "Nebutra Journal"}
                </div>
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[var(--neutral-12)] sm:text-5xl">
                  {post.title}
                </h1>
                {post.excerpt && (
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--neutral-11)]">
                    {post.excerpt}
                  </p>
                )}
              </div>

              <div className="space-y-4 text-sm text-[var(--neutral-11)]">
                <div className="grid gap-2">
                  {authorName && (
                    <span className="font-medium text-[var(--neutral-12)]">{authorName}</span>
                  )}
                  {date && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" aria-hidden />
                      <time dateTime={post.date}>{date}</time>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" aria-hidden />
                    {estimateReadTime(post, isZh)}
                  </span>
                </div>
                {translation && (
                  <a
                    href={languageSwitchPostHref(translationLocale, translation.slug)}
                    hrefLang={targetLanguage === "zh" ? "zh-CN" : "en"}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-1.5 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
                  >
                    <Globe className="size-4" aria-hidden />
                    {targetLanguage === "zh" ? "阅读中文版" : "Read in English"}
                  </a>
                )}
              </div>
            </div>
          </AnimateIn>
        </header>

        {/* Hero image */}
        <AnimateIn preset="fadeUp" inView>
          <div className="relative mt-8 h-64 w-full overflow-hidden rounded-[var(--radius-lg)] sm:h-96">
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
            />
          </div>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView>
          <div className="mx-auto mt-10 max-w-3xl">
            <BlogPortableText
              body={post.body}
              copyLabel={isZh ? "复制原文" : "Copy original"}
              copiedLabel={isZh ? "已复制" : "Copied"}
            />
          </div>
        </AnimateIn>
      </article>

      <FooterMinimal />
    </main>
  );
}

function BlogPostSkeleton() {
  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-zinc-950" aria-busy="true">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div className="h-8 w-36 animate-pulse rounded bg-[var(--neutral-3)]" />
        <div className="hidden gap-3 sm:flex">
          <div className="h-4 w-16 animate-pulse rounded bg-[var(--neutral-3)]" />
          <div className="h-4 w-16 animate-pulse rounded bg-[var(--neutral-3)]" />
          <div className="h-4 w-16 animate-pulse rounded bg-[var(--neutral-3)]" />
        </div>
      </div>
      <article className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-8 h-5 w-28 animate-pulse rounded bg-[var(--neutral-3)]" />
        <div className="h-10 w-3/4 animate-pulse rounded bg-[var(--neutral-3)]" />
        <div className="mt-4 h-5 w-1/2 animate-pulse rounded bg-[var(--neutral-3)]" />
        <div className="mt-8 h-32 w-full animate-pulse rounded bg-[var(--neutral-3)]" />
        <div className="mt-8 space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-[var(--neutral-3)]" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-[var(--neutral-3)]" />
          <div className="h-4 w-10/12 animate-pulse rounded bg-[var(--neutral-3)]" />
        </div>
      </article>
      <div className="mx-auto max-w-6xl border-t border-[var(--neutral-6)] px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-8 w-36 animate-pulse rounded bg-[var(--neutral-3)]" />
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="h-4 animate-pulse rounded bg-[var(--neutral-3)]" />
          <div className="h-4 animate-pulse rounded bg-[var(--neutral-3)]" />
          <div className="h-4 animate-pulse rounded bg-[var(--neutral-3)]" />
          <div className="h-4 animate-pulse rounded bg-[var(--neutral-3)]" />
        </div>
      </div>
    </main>
  );
}
