import {
  type BlogPostWithSource,
  estimateReadTime,
  extractBodyText,
  getBlogUrlSegment,
  getBlogViewTransitionName,
  resolveBlogCover,
  toBlogLanguage,
} from "@nebutra/blog";
import { getImageUrl } from "@nebutra/sanity/image";
import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import { BlogIndexExplorer, type BlogIndexPost } from "@/components/landing/blog-index-explorer";
import {
  type BlogHeroTopic,
  BlogMotionHero,
  type BlogRailPost,
  LatestPostMotionRail,
} from "@/components/landing/blog-motion-showcase";
import { type Locale, routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
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
    title: isZh ? "博客 — Nebutra" : "Blog — Nebutra",
    description: isZh
      ? "来自 Nebutra 团队的工程实践、产品进展与 SaaS 架构笔记。"
      : "Engineering insights, product updates, and SaaS best practices from the Nebutra team.",
    alternates: { canonical: localizedBlogHref(lang) },
  };
}

function getAuthorName(author: BlogPostWithSource["author"]): string | null {
  if (!author) return null;
  return typeof author === "string" ? author : (author.name ?? null);
}

function getAuthorAvatarUrl(author: BlogPostWithSource["author"]): string | null {
  if (!author || typeof author === "string" || !author.image) return null;
  return getImageUrl(author.image as Parameters<typeof getImageUrl>[0], {
    width: 96,
    height: 96,
    format: "webp",
  });
}

function getPostCover(post: BlogPostWithSource, width: number, height: number) {
  const imageUrl = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width,
        height,
        format: "webp",
      })
    : null;

  return resolveBlogCover(post, { alt: `${post.title} cover`, imageUrl });
}

function localizedBlogHref(lang: string, slug?: string): string {
  const prefix = lang === routing.defaultLocale ? "" : `/${lang}`;
  return slug ? `${prefix}/blog/${slug}` : `${prefix}/blog`;
}

async function getCachedAllPosts(language: ReturnType<typeof toBlogLanguage>) {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  return getAllPosts(language);
}

function formatPostDate(post: BlogPostWithSource, isZh: boolean): string | null {
  return post.date
    ? new Date(post.date).toLocaleDateString(isZh ? "zh-CN" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
}

function getTopTags(posts: BlogPostWithSource[], limit = 4): string[] {
  const counts = new Map<string, number>();
  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
}

function localizedTagHref(lang: string, tag: string): string {
  return `${localizedBlogHref(lang)}/tag/${getBlogUrlSegment(tag)}`;
}

function getFallbackTopics(isZh: boolean): string[] {
  return isZh
    ? ["AI SaaS", "平台工程", "设计系统", "治理"]
    : ["AI SaaS", "Platform Engineering", "Design System", "Governance"];
}

function toBlogHeroTopics(tags: string[], lang: string, isZh: boolean): BlogHeroTopic[] {
  const topics = tags.length > 0 ? tags : getFallbackTopics(isZh);

  return topics.map((topic) => ({
    href: localizedTagHref(lang, topic),
    label: topic,
  }));
}

function localizedContactHref(lang: string): string {
  const prefix = lang === routing.defaultLocale ? "" : `/${lang}`;
  return `${prefix}/contact`;
}

function toBlogRailPost(post: BlogPostWithSource, lang: string, isZh: boolean): BlogRailPost {
  return {
    dateLabel: formatPostDate(post, isZh),
    href: localizedBlogHref(lang, post.slug),
    id: post.id,
    readTime: estimateReadTime(post, isZh),
    title: post.title,
  };
}

function toBlogIndexPost(post: BlogPostWithSource, lang: string, isZh: boolean): BlogIndexPost {
  const cover = getPostCover(post, 840, 520);

  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    href: localizedBlogHref(lang, post.slug),
    tags: post.tags,
    dateLabel: formatPostDate(post, isZh),
    readTime: estimateReadTime(post, isZh),
    authorName: getAuthorName(post.author),
    authorAvatarUrl: getAuthorAvatarUrl(post.author),
    imageUrl: cover.src,
    imageAlt: cover.alt,
    fallbackImageUrl: cover.fallbackSrc,
    fallbackImageAlt: cover.fallbackAlt,
    imageBlurDataURL: cover.blurDataURL,
    searchText: extractBodyText(post),
    viewTransitionName: getBlogViewTransitionName(post.id),
  };
}

export default function BlogPage({ params }: { params: Promise<{ lang: string }> }) {
  return (
    <Suspense fallback={<BlogPageSkeleton />}>
      <BlogPageLoader params={params} />
    </Suspense>
  );
}

async function BlogPageLoader({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();
  setRequestLocale(lang as Locale);

  const isZh = lang === "zh";
  const blogLanguage = toBlogLanguage(lang);
  const posts = await getCachedAllPosts(blogLanguage);
  const topTags = getTopTags(posts);
  const heroTopics = toBlogHeroTopics(topTags, lang, isZh);
  const latestRailPosts = posts.map((post) => toBlogRailPost(post, lang, isZh));

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 lg:px-8">
        <AnimateIn preset="emerge" inView>
          <BlogMotionHero
            contactHref={localizedContactHref(lang)}
            isZh={isZh}
            topics={heroTopics}
          />
        </AnimateIn>

        {posts.length === 0 ? (
          <AnimateIn preset="fadeUp" inView>
            <div className="flex flex-col items-center gap-6 py-24 text-center">
              <div>
                <p className="text-lg font-medium text-[var(--neutral-12)]">
                  {isZh ? "暂时还没有文章。" : "No posts yet — our first articles are on the way."}
                </p>
                <p className="mt-2 text-sm text-[var(--neutral-11)]">
                  {isZh
                    ? "你可以先通过下面这些入口了解我们正在交付的内容。"
                    : "In the meantime, here are three ways to follow what we're shipping."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/${lang}/changelog`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-5 py-2.5 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
                >
                  {isZh ? "阅读更新日志" : "Read our changelog"}
                </Link>
                <Link
                  href="/api/changelog/rss"
                  prefetch={false}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-5 py-2.5 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
                >
                  {isZh ? "订阅 RSS" : "Subscribe via RSS"}
                </Link>
                <a
                  href="https://x.com/nebutra_ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-5 py-2.5 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
                >
                  {isZh ? "关注 @nebutra_ai" : "Follow @nebutra_ai"}
                </a>
              </div>
            </div>
          </AnimateIn>
        ) : (
          <div className="pb-20">
            <AnimateIn preset="fadeUp" inView>
              <LatestPostMotionRail isZh={isZh} posts={latestRailPosts} />
            </AnimateIn>

            <AnimateIn preset="fadeUp" inView>
              <BlogIndexExplorer
                posts={posts.map((post) => toBlogIndexPost(post, lang, isZh))}
                isZh={isZh}
              />
            </AnimateIn>
          </div>
        )}
      </section>

      <FooterMinimal />
    </main>
  );
}

function BlogPageSkeleton() {
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
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="border-y border-[var(--neutral-6)] py-10 sm:py-14">
          <div className="h-6 w-40 animate-pulse rounded bg-[var(--neutral-3)]" />
          <div className="mt-6 h-12 w-3/4 animate-pulse rounded bg-[var(--neutral-3)]" />
          <div className="mt-5 h-5 w-1/2 animate-pulse rounded bg-[var(--neutral-3)]" />
        </div>
        <div className="mt-12 h-80 rounded-[var(--radius-lg)] bg-[var(--neutral-2)]" />
      </section>
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
