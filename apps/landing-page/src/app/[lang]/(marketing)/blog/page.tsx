import {
  type BlogPostWithSource,
  estimateReadTime,
  extractBodyText,
  getBlogUrlSegment,
  getBlogViewTransitionName,
  resolveBlogCover,
  toBlogLanguage,
} from "@nebutra/blog";
import { ArrowRight, BookOpen } from "@nebutra/icons";
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

function BlogHeroTopics({ isZh, lang, topics }: { isZh: boolean; lang: string; topics: string[] }) {
  return (
    <div className="border-y border-[var(--neutral-6)] py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-24">
        <div className="flex flex-col justify-between gap-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-1 text-xs font-medium text-[var(--neutral-11)]">
              <BookOpen className="size-3.5" aria-hidden />
              {isZh ? "Nebutra 技术博客" : "Nebutra Journal"}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--neutral-12)]">
              {isZh ? "Blog" : "Blog"}
            </h1>
          </div>
          <p className="max-w-sm text-base leading-7 text-[var(--neutral-11)]">
            {isZh
              ? "少量、认真、可复用的文章：记录 Nebutra 在工程、产品、治理和 AI 原生交付中的真实取舍。"
              : "Sparse, careful writing on Nebutra's engineering, product, governance, and AI-native delivery decisions."}
          </p>
        </div>

        <nav aria-label={isZh ? "博客主题" : "Blog topics"} className="space-y-2">
          {(topics.length > 0
            ? topics
            : isZh
              ? ["AI SaaS", "平台工程", "设计系统", "治理"]
              : ["AI SaaS", "Platform Engineering", "Design System", "Governance"]
          ).map((topic) => (
            <Link
              key={topic}
              href={localizedTagHref(lang, topic)}
              className="group flex max-w-4xl items-center justify-between gap-4 text-balance border-b border-transparent py-0.5 text-3xl font-semibold leading-[0.98] tracking-tight text-[var(--neutral-12)] transition-colors hover:border-[var(--neutral-7)] hover:text-[var(--blue-9)] sm:text-5xl lg:text-6xl"
            >
              <span className="min-w-0">{topic}</span>
              <ArrowRight
                className="mt-1 size-7 shrink-0 text-[var(--neutral-9)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--blue-9)] sm:size-10"
                aria-hidden
              />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function LatestPostRail({
  isZh,
  lang,
  posts,
}: {
  isZh: boolean;
  lang: string;
  posts: BlogPostWithSource[];
}) {
  if (posts.length === 0) return null;

  return (
    <section
      aria-label={isZh ? "最新文章" : "Latest posts"}
      className="relative -mx-4 border-b border-[var(--neutral-6)] sm:-mx-6 lg:-mx-8"
    >
      <div className="flex overflow-x-auto px-4 sm:px-6 lg:px-8">
        {posts.slice(0, 5).map((post, index) => (
          <Link
            key={post.id}
            href={localizedBlogHref(lang, post.slug)}
            className="group flex min-w-[240px] flex-1 flex-col justify-between border-l border-[var(--neutral-6)] px-5 py-6 transition-colors first:border-l-0 hover:bg-[var(--neutral-2)] lg:min-w-0"
          >
            <div>
              <p className="text-xs font-medium text-[var(--neutral-10)]">
                {formatPostDate(post, isZh) ?? (isZh ? "未定日期" : "Undated")}
              </p>
              <h2
                className={`mt-3 line-clamp-3 text-base font-semibold leading-snug text-[var(--neutral-12)] transition-colors group-hover:text-[var(--blue-9)] ${
                  index === 0 ? "sm:text-lg" : ""
                }`}
              >
                {post.title}
              </h2>
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--neutral-10)]">
              {estimateReadTime(post, isZh)}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[var(--neutral-1)] to-transparent sm:w-14"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--neutral-1)] to-transparent sm:w-14"
        aria-hidden
      />
    </section>
  );
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

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 lg:px-8">
        <AnimateIn preset="emerge" inView>
          <BlogHeroTopics isZh={isZh} lang={lang} topics={topTags} />
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
              <LatestPostRail isZh={isZh} lang={lang} posts={posts} />
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
        <div className="mt-12 h-80 rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-2)]" />
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
