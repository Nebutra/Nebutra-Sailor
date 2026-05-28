import {
  type BlogPostWithSource,
  estimateReadTime,
  extractBodyText,
  getBlogUrlSegment,
  getBlogViewTransitionName,
  resolveBlogCover,
  toBlogLanguage,
} from "@nebutra/blog";
import { BookOpen } from "@nebutra/icons";
import { getImageUrl } from "@nebutra/sanity/image";
import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import { BlogIndexExplorer, type BlogIndexPost } from "@/components/landing/blog-index-explorer";
import { type Locale, routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";

type Params = { lang: string; tag: string };

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

function matchesSegment(value: string, segment: string): boolean {
  const decoded = decodeURIComponent(segment);
  return getBlogUrlSegment(value) === segment || getBlogUrlSegment(value) === decoded;
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

function getPostCover(post: BlogPostWithSource) {
  const imageUrl = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width: 840,
        height: 520,
        format: "webp",
      })
    : null;
  return resolveBlogCover(post, { alt: `${post.title} cover`, imageUrl });
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

function toBlogIndexPost(post: BlogPostWithSource, lang: string, isZh: boolean): BlogIndexPost {
  const cover = getPostCover(post);
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

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang, tag } = await params;
  const tagLabel = decodeURIComponent(tag);
  if (!hasLocale(routing.locales, lang)) return {};
  return {
    title: `${tagLabel} — Nebutra Blog`,
    alternates: { canonical: `${localizedBlogHref(lang)}/tag/${tag}` },
  };
}

export default function BlogTagPage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<BlogTagPageSkeleton />}>
      <BlogTagPageLoader params={params} />
    </Suspense>
  );
}

async function BlogTagPageLoader({ params }: { params: Promise<Params> }) {
  const { lang, tag } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();
  setRequestLocale(lang as Locale);

  const isZh = lang === "zh";
  const posts = (await getCachedAllPosts(toBlogLanguage(lang))).filter((post) =>
    post.tags.some((postTag) => matchesSegment(postTag, tag)),
  );
  const tagLabel = decodeURIComponent(tag).replace(/-/g, " ");

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <AnimateIn preset="emerge" inView>
          <div className="border-y border-[var(--neutral-6)] py-10 sm:py-14">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-1 text-xs font-medium text-[var(--neutral-11)]">
              <BookOpen className="size-3.5" aria-hidden />
              {isZh ? "专题" : "Topic"}
            </div>
            <h1 className="text-4xl font-semibold text-[var(--neutral-12)] sm:text-5xl">
              {tagLabel}
            </h1>
            <p className="mt-4 text-sm text-[var(--neutral-11)]">
              {isZh ? `${posts.length} 篇文章` : `${posts.length} posts`}
            </p>
          </div>
        </AnimateIn>
        <AnimateIn preset="fadeUp" inView>
          <BlogIndexExplorer
            posts={posts.map((post) => toBlogIndexPost(post, lang, isZh))}
            isZh={isZh}
          />
        </AnimateIn>
      </section>
      <FooterMinimal />
    </main>
  );
}

function BlogTagPageSkeleton() {
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
          <div className="h-6 w-28 animate-pulse rounded-full bg-[var(--neutral-3)]" />
          <div className="mt-6 h-12 w-64 animate-pulse rounded bg-[var(--neutral-3)]" />
          <div className="mt-5 h-4 w-32 animate-pulse rounded bg-[var(--neutral-3)]" />
        </div>
        <div className="mt-12 h-80 rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-2)]" />
      </section>
    </main>
  );
}
