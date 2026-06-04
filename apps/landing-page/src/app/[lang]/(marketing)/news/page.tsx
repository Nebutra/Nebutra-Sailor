import {
  type BlogPostWithSource,
  extractBodyText,
  resolveBlogCover,
  toBlogLanguage,
} from "@nebutra/blog";
import { getImageUrl } from "@nebutra/sanity/image";
import { AnimateIn } from "@nebutra/ui/components";
import { format as formatDate } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import { NewsArchive, type NewsArchiveItem } from "@/components/landing/news-archive";
import {
  NewsFeatured,
  type NewsFeaturedItem,
  type NewsRailItem,
} from "@/components/landing/news-featured";
import { NewsroomHero } from "@/components/landing/news-hero";
import { type Locale, routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

function localePrefix(lang: string): string {
  return lang === routing.defaultLocale ? "" : `/${lang}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  const isZh = lang === "zh";
  return {
    title: isZh ? "新闻中心 — Nebutra" : "Newsroom — Nebutra",
    description: isZh
      ? "Nebutra 的产品发布、公告与平台动态。"
      : "Product launches, announcements, and platform updates from Nebutra.",
    alternates: { canonical: `${localePrefix(lang)}/news` },
  };
}

async function getCachedAllPosts(language: ReturnType<typeof toBlogLanguage>) {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  return getAllPosts(language);
}

function formatPostDate(post: BlogPostWithSource, isZh: boolean): string | null {
  if (!post.date) return null;
  const d = new Date(post.date);
  if (Number.isNaN(d.getTime())) return null;
  return formatDate(d, isZh ? "yyyy年M月d日" : "MMM d, yyyy", isZh ? { locale: zhCN } : undefined);
}

function getCategory(post: BlogPostWithSource): string | null {
  return post.tags[0] ?? null;
}

function articleHref(lang: string, slug: string): string {
  return `${localePrefix(lang)}/blog/${slug}`;
}

function getFeaturedCover(post: BlogPostWithSource) {
  const imageUrl = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width: 840,
        height: 520,
        format: "webp",
      })
    : null;
  return resolveBlogCover(post, { alt: `${post.title} cover`, imageUrl });
}

function toFeaturedItem(post: BlogPostWithSource, lang: string, isZh: boolean): NewsFeaturedItem {
  const cover = getFeaturedCover(post);
  return {
    id: post.id,
    title: post.title,
    href: articleHref(lang, post.slug),
    category: getCategory(post),
    dateLabel: formatPostDate(post, isZh),
    excerpt: post.excerpt,
    imageUrl: cover.src,
    imageAlt: cover.alt,
    fallbackImageUrl: cover.fallbackSrc,
    fallbackImageAlt: cover.fallbackAlt,
    imageBlurDataURL: cover.blurDataURL,
  };
}

function toRailItem(post: BlogPostWithSource, lang: string, isZh: boolean): NewsRailItem {
  return {
    id: post.id,
    title: post.title,
    href: articleHref(lang, post.slug),
    category: getCategory(post),
    dateLabel: formatPostDate(post, isZh),
    excerpt: post.excerpt,
  };
}

function toArchiveItem(post: BlogPostWithSource, lang: string, isZh: boolean): NewsArchiveItem {
  return {
    id: post.id,
    title: post.title,
    href: articleHref(lang, post.slug),
    category: getCategory(post),
    dateLabel: formatPostDate(post, isZh),
    searchText: extractBodyText(post),
  };
}

export default function NewsPage({ params }: { params: Promise<{ lang: string }> }) {
  return (
    <Suspense fallback={<NewsPageSkeleton />}>
      <NewsPageLoader params={params} />
    </Suspense>
  );
}

async function NewsPageLoader({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();
  setRequestLocale(lang as Locale);

  const isZh = lang === "zh";
  const posts = await getCachedAllPosts(toBlogLanguage(lang));

  const contactHref = `${localePrefix(lang)}/contact`;
  const rssHref = "/api/changelog/rss";

  const featured = posts[0] ? toFeaturedItem(posts[0], lang, isZh) : null;
  const rail = posts.slice(1, 5).map((post) => toRailItem(post, lang, isZh));
  const archive = posts.map((post) => toArchiveItem(post, lang, isZh));

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar />

      <div className="mx-auto max-w-[1400px] px-4 pt-16 sm:px-6 lg:px-8">
        <AnimateIn preset="emerge" inView>
          <NewsroomHero contactHref={contactHref} rssHref={rssHref} isZh={isZh} />
        </AnimateIn>

        {featured ? (
          <>
            <AnimateIn preset="fadeUp" inView>
              <div className="mt-14 border-t border-[var(--neutral-6)] pt-14">
                <NewsFeatured featured={featured} rail={rail} />
              </div>
            </AnimateIn>

            <AnimateIn preset="fadeUp" inView>
              <div className="mt-20 border-t border-[var(--neutral-6)] pb-24 pt-14">
                <NewsArchive items={archive} isZh={isZh} />
              </div>
            </AnimateIn>
          </>
        ) : (
          <AnimateIn preset="fadeUp" inView>
            <div className="mt-16 flex flex-col items-center gap-3 border-t border-[var(--neutral-6)] py-24 text-center">
              <p className="text-lg font-medium text-[var(--neutral-12)]">
                {isZh ? "暂时还没有新闻。" : "No news yet — announcements are on the way."}
              </p>
              <p className="text-sm text-[var(--neutral-11)]">
                {isZh ? "敬请关注后续更新。" : "Check back soon for updates."}
              </p>
            </div>
          </AnimateIn>
        )}
      </div>

      <FooterMinimal />
    </main>
  );
}

function NewsPageSkeleton() {
  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-zinc-950" aria-busy="true">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div className="h-8 w-36 animate-pulse rounded bg-[var(--neutral-3)]" />
        <div className="hidden gap-3 sm:flex">
          <div className="h-4 w-16 animate-pulse rounded bg-[var(--neutral-3)]" />
          <div className="h-4 w-16 animate-pulse rounded bg-[var(--neutral-3)]" />
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-4 pt-16 sm:px-6 lg:px-8">
        <div className="h-14 w-72 animate-pulse rounded bg-[var(--neutral-3)]" />
        <div className="mt-14 grid gap-12 border-t border-[var(--neutral-6)] pt-14 lg:grid-cols-[1.65fr_1fr]">
          <div className="h-[26rem] animate-pulse rounded-[var(--radius-xl)] bg-[var(--neutral-2)]" />
          <div className="flex flex-col gap-6">
            <div className="h-24 animate-pulse rounded bg-[var(--neutral-2)]" />
            <div className="h-24 animate-pulse rounded bg-[var(--neutral-2)]" />
            <div className="h-24 animate-pulse rounded bg-[var(--neutral-2)]" />
          </div>
        </div>
      </div>
    </main>
  );
}
