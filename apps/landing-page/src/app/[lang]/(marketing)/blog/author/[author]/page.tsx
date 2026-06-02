import {
  type BlogPostWithSource,
  estimateReadTime,
  extractBodyText,
  getBlogUrlSegment,
  getBlogViewTransitionName,
  resolveBlogCover,
  toBlogLanguage,
} from "@nebutra/blog";
import { User } from "@nebutra/icons";
import { getImageUrl } from "@nebutra/sanity/image";
import { AnimateIn } from "@nebutra/ui/components";
import { format as formatDate } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import { BlogIndexExplorer, type BlogIndexPost } from "@/components/landing/blog-index-explorer";
import { type Locale, routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";

type Params = { author: string; lang: string };

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

function getAuthorAvatarUrl(author: BlogPostWithSource["author"], size = 96): string | null {
  if (!author || typeof author === "string" || !author.image) return null;
  return getImageUrl(author.image as Parameters<typeof getImageUrl>[0], {
    width: size,
    height: size,
    format: "webp",
  });
}

function getAuthorBio(author: BlogPostWithSource["author"]): string | null {
  if (!author || typeof author === "string") return null;
  return typeof author.bio === "string" ? author.bio : null;
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
  if (!post.date) return null;
  const d = new Date(post.date);
  if (Number.isNaN(d.getTime())) return null;
  return formatDate(d, isZh ? "yyyy年M月d日" : "MMMM d, yyyy", isZh ? { locale: zhCN } : undefined);
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
  const { author, lang } = await params;
  const authorLabel = decodeURIComponent(author);
  if (!hasLocale(routing.locales, lang)) return {};
  return {
    title: `${authorLabel} — Nebutra Blog`,
    alternates: { canonical: `${localizedBlogHref(lang)}/author/${author}` },
  };
}

export default function BlogAuthorPage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<BlogAuthorPageSkeleton />}>
      <BlogAuthorPageLoader params={params} />
    </Suspense>
  );
}

async function BlogAuthorPageLoader({ params }: { params: Promise<Params> }) {
  const { author, lang } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();
  setRequestLocale(lang as Locale);

  const isZh = lang === "zh";
  const allPosts = await getCachedAllPosts(toBlogLanguage(lang));
  const posts = allPosts.filter((post) => {
    const name = getAuthorName(post.author);
    return name ? matchesSegment(name, author) : false;
  });
  const firstPost = posts[0];
  const authorName = firstPost ? getAuthorName(firstPost.author) : decodeURIComponent(author);
  const avatarUrl = firstPost ? getAuthorAvatarUrl(firstPost.author, 160) : null;
  const bio = firstPost ? getAuthorBio(firstPost.author) : null;

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <AnimateIn preset="emerge" inView>
          <div className="border-y border-[var(--neutral-6)] py-10 sm:py-14">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-[var(--neutral-7)]/60 bg-[var(--neutral-2)] text-[var(--neutral-10)]">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={authorName ? `${authorName} avatar` : ""}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="size-8" aria-hidden />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--neutral-10)]">
                  {isZh ? "作者" : "Author"}
                </p>
                <h1 className="mt-2 text-4xl font-semibold text-[var(--neutral-12)] sm:text-5xl">
                  {authorName}
                </h1>
                <p className="mt-3 text-sm leading-6 text-[var(--neutral-11)]">
                  {bio || (isZh ? `${posts.length} 篇文章` : `${posts.length} posts`)}
                </p>
              </div>
            </div>
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

function BlogAuthorPageSkeleton() {
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
          <div className="flex items-center gap-5">
            <div className="size-20 animate-pulse rounded-full bg-[var(--neutral-3)]" />
            <div className="flex-1">
              <div className="h-4 w-20 animate-pulse rounded bg-[var(--neutral-3)]" />
              <div className="mt-4 h-11 w-64 animate-pulse rounded bg-[var(--neutral-3)]" />
              <div className="mt-4 h-4 w-48 animate-pulse rounded bg-[var(--neutral-3)]" />
            </div>
          </div>
        </div>
        <div className="mt-12 h-80 rounded-[var(--radius-lg)] bg-[var(--neutral-2)]" />
      </section>
    </main>
  );
}
