import { ArrowLeft, Calendar } from "@nebutra/icons";
import { getImageUrl } from "@nebutra/sanity/image";
import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { BlogPortableText } from "@/components/landing/blog-portable-text";
import { type Locale, routing } from "@/i18n/routing";
import {
  type BlogLanguage,
  type BlogPostWithSource,
  getPostBySlug,
  getPostTranslation,
  toBlogLanguage,
} from "@/lib/blog";

type Params = { lang: string; slug: string };

// Sentinel slug Next emits during static prerender warm-up before any blog
// pages exist; surfacing it to Sanity wastes a fetch + pollutes error logs.
const EMPTY_BLOG_PLACEHOLDER_SLUG = "empty-placeholder-do-not-fetch";

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");

  const { lang, slug } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  if (slug === EMPTY_BLOG_PLACEHOLDER_SLUG) return {};
  cacheTag(`blog:${slug}`);

  const post = await getPostBySlug(slug, toBlogLanguage(lang));
  if (!post) return {};

  const ogImage = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width: 1200,
        height: 630,
        format: "webp",
      })
    : undefined;

  return {
    title: `${post.title} — Nebutra Blog`,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `/${lang}/blog/${slug}` },
    openGraph: ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : undefined,
  };
}

function getAuthorName(author: BlogPostWithSource["author"]): string | null {
  if (!author) return null;
  return typeof author === "string" ? author : (author.name ?? null);
}

function localizedPostHref(locale: string, slug: string): string {
  return locale === routing.defaultLocale ? `/blog/${slug}` : `/${locale}/blog/${slug}`;
}

function oppositeBlogLanguage(language: BlogLanguage): BlogLanguage {
  return language === "zh" ? "en" : "zh";
}

function localeForBlogLanguage(language: BlogLanguage): Locale {
  return language === "zh" ? "zh" : "en";
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  "use cache";
  cacheLife("hours");

  const { lang, slug } = await params;

  if (!hasLocale(routing.locales, lang)) notFound();
  const isZh = lang === "zh";
  cacheTag("blog");
  cacheTag(`blog:${slug}`);
  setRequestLocale(lang as Locale);

  const blogLanguage = toBlogLanguage(lang);
  const post = await getPostBySlug(slug, blogLanguage);
  if (!post) notFound();
  const targetLanguage = oppositeBlogLanguage(blogLanguage);
  const translation = post.translationKey
    ? await getPostTranslation(post.translationKey, targetLanguage)
    : null;

  const imageUrl = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width: 1200,
        height: 630,
        format: "webp",
      })
    : null;

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

      <article className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Back link */}
        <AnimateIn preset="fade" inView>
          <Link
            href={`/${lang}/blog`}
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--neutral-11)] hover:text-[var(--blue-9)] transition-colors rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {isZh ? "全部文章" : "All posts"}
          </Link>
        </AnimateIn>

        {/* Categories */}
        {post.tags.length > 0 && (
          <AnimateIn preset="fadeUp" inView>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {post.tags.map((cat) => (
                <span
                  key={cat}
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-[var(--blue-9)]"
                  style={{ background: "var(--blue-3)" }}
                >
                  {cat}
                </span>
              ))}
            </div>
          </AnimateIn>
        )}

        {/* Title */}
        <AnimateIn preset="emerge" inView>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--neutral-12)] sm:text-4xl">
            {post.title}
          </h1>
        </AnimateIn>

        {/* Meta */}
        <AnimateIn preset="fadeUp" inView>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--neutral-11)]">
              {authorName && (
                <span className="font-medium text-[var(--neutral-12)]">{authorName}</span>
              )}
              {date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  <time dateTime={post.date}>{date}</time>
                </span>
              )}
            </div>
            {translation && (
              <Link
                href={localizedPostHref(localeForBlogLanguage(targetLanguage), translation.slug)}
                hrefLang={targetLanguage === "zh" ? "zh-CN" : "en"}
                className="inline-flex items-center rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-1.5 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
              >
                {targetLanguage === "zh" ? "阅读中文版" : "Read in English"}
              </Link>
            )}
          </div>
        </AnimateIn>

        {/* Hero image */}
        {imageUrl && (
          <AnimateIn preset="fadeUp" inView>
            <div className="relative mt-8 h-64 w-full overflow-hidden rounded-xl sm:h-80">
              <Image
                src={imageUrl}
                alt={post.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 720px"
              />
            </div>
          </AnimateIn>
        )}

        {/* Excerpt */}
        {post.excerpt && (
          <AnimateIn preset="fadeUp" inView>
            <p className="mt-8 text-lg leading-7 text-[var(--neutral-11)]">{post.excerpt}</p>
          </AnimateIn>
        )}

        {/* Body */}
        <AnimateIn preset="fadeUp" inView>
          <div className="mt-8">
            <BlogPortableText body={post.body} />
          </div>
        </AnimateIn>
      </article>

      <FooterMinimal />
    </main>
  );
}
