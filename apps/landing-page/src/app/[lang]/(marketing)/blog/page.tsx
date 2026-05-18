import { ArrowRight, BookOpen, Calendar } from "@nebutra/icons";
import { getImageUrl } from "@nebutra/sanity/image";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import { BlogTransitionLink } from "@/components/landing/blog-transition-link";
import { type Locale, routing } from "@/i18n/routing";
import { type BlogPostWithSource, getAllPosts, toBlogLanguage } from "@/lib/blog";
import { getFallbackBlogCover } from "@/lib/blog-covers";

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

function getPostSourceLabel(post: BlogPostWithSource): string {
  if (post.contentSource.kind === "commentary") return "Commentary";
  if (post.contentSource.kind === "syndicated") return "Syndicated";
  return "Nebutra Originals";
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

function ArticleVisual({
  post,
  imageUrl,
  variant = "compact",
}: {
  post: BlogPostWithSource;
  imageUrl: string | null;
  variant?: "featured" | "compact";
}) {
  const fallbackCover = getFallbackBlogCover(post);
  const coverSrc = imageUrl ?? fallbackCover.src;
  const coverAlt = imageUrl ? post.title : fallbackCover.alt;

  return (
    <div
      style={{ viewTransitionName: `blog-cover-${post.slug}` }}
      className={
        variant === "featured"
          ? "relative min-h-72 overflow-hidden bg-[var(--neutral-3)] lg:min-h-full"
          : "relative h-48 w-full overflow-hidden bg-[var(--neutral-3)]"
      }
    >
      <Image
        src={coverSrc}
        alt={coverAlt}
        fill
        priority={variant === "featured"}
        className="object-cover transition-transform duration-150 group-hover:-translate-y-px"
        sizes={variant === "featured" ? "(max-width: 1024px) 100vw, 420px" : "360px"}
      />
    </div>
  );
}

function FeaturedPostCard({ post, lang }: { post: BlogPostWithSource; lang: string }) {
  const isZh = lang === "zh";
  const imageUrl = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width: 1200,
        height: 720,
        format: "webp",
      })
    : null;

  const date = formatPostDate(post, isZh);
  const authorName = getAuthorName(post.author);

  return (
    <BlogTransitionLink
      href={localizedBlogHref(lang, post.slug)}
      className="group grid overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] shadow-sm transition-shadow hover:shadow-md lg:grid-cols-[0.9fr_1.1fr]"
    >
      <ArticleVisual post={post} imageUrl={imageUrl} variant="featured" />

      <div className="flex min-h-80 flex-col p-6 sm:p-8">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--neutral-11)]">
          <span className="rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-[var(--neutral-12)]">
            {isZh ? "最新文章" : "Latest"}
          </span>
          <span className="rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-[var(--neutral-12)]">
            {getPostSourceLabel(post)}
          </span>
          <span>{estimateReadTime(post, isZh)}</span>
        </div>

        <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-[var(--neutral-12)] transition-colors group-hover:text-[var(--blue-9)]">
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--neutral-11)]">
            {post.excerpt}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-8">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--neutral-10)]">
            {date && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" aria-hidden />
                {date}
              </span>
            )}
            {authorName && <span>{authorName}</span>}
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--blue-9)]">
            {isZh ? "阅读全文" : "Read article"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </BlogTransitionLink>
  );
}

function PostCard({ post, lang }: { post: BlogPostWithSource; lang: string }) {
  const isZh = lang === "zh";
  const imageUrl = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width: 720,
        height: 420,
        format: "webp",
      })
    : null;
  const date = formatPostDate(post, isZh);

  return (
    <BlogTransitionLink
      href={localizedBlogHref(lang, post.slug)}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] transition-shadow hover:shadow-sm"
    >
      <ArticleVisual post={post} imageUrl={imageUrl} />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3">
          <span className="rounded-full border border-[var(--neutral-7)] px-2 py-0.5 text-xs font-medium text-[var(--neutral-11)]">
            {getPostSourceLabel(post)}
          </span>
        </div>
        <h2 className="text-base font-semibold text-[var(--neutral-12)] transition-colors group-hover:text-[var(--blue-9)]">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--neutral-11)]">
            {post.excerpt}
          </p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-[var(--neutral-10)]">
          {date && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" aria-hidden />
              {date}
            </span>
          )}
          <span>{estimateReadTime(post, isZh)}</span>
        </div>
      </div>
    </BlogTransitionLink>
  );
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
  const [featuredPost, ...archivePosts] = posts;

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <AnimateIn preset="emerge" inView>
          <div className="border-y border-[var(--neutral-6)] py-10 sm:py-14">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-1 text-xs font-medium text-[var(--neutral-11)]">
                  <BookOpen className="size-3.5" aria-hidden />
                  {isZh ? "Nebutra 技术博客" : "Nebutra Journal"}
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-[var(--neutral-12)] sm:text-5xl">
                  {isZh
                    ? "面向 AI SaaS 的工程、产品与治理笔记"
                    : "Engineering notes for AI-native SaaS"}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--neutral-11)] sm:text-lg">
                  {isZh
                    ? "少量、认真、可复用的文章：记录 Nebutra 在多租户、国际化、平台工程和 AI 产品交付中的真实取舍。"
                    : "Sparse, careful, reusable writing on multi-tenancy, localization, platform engineering, and AI product delivery inside Nebutra."}
                </p>
              </div>
            </div>
          </div>
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
          <div className="py-12">
            {featuredPost && (
              <AnimateIn preset="fadeUp" inView>
                <FeaturedPostCard post={featuredPost} lang={lang} />
              </AnimateIn>
            )}

            {archivePosts.length > 0 && (
              <AnimateInGroup
                stagger="fast"
                className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {archivePosts.map((post) => (
                  <AnimateIn key={post.id} preset="fadeUp" inView>
                    <PostCard post={post} lang={lang} />
                  </AnimateIn>
                ))}
              </AnimateInGroup>
            )}
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
