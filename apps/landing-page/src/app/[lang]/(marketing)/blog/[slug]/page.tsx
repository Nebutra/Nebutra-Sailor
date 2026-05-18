import { ArrowLeft, BookOpen, Calendar, Clock, External, Globe } from "@nebutra/icons";
import { getImageUrl } from "@nebutra/sanity/image";
import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import { BlogCopyButton } from "@/components/landing/blog-copy-button";
import { BlogPortableText } from "@/components/landing/blog-portable-text";
import { BlogReadingProgress } from "@/components/landing/blog-reading-progress";
import { BlogShareBar } from "@/components/landing/blog-share-bar";
import { BlogTransitionLink } from "@/components/landing/blog-transition-link";
import { type Locale, routing } from "@/i18n/routing";
import {
  type BlogLanguage,
  type BlogPostWithSource,
  getLocalizedPostForSiblingSlug,
  getPostBySlug,
  getPostTranslation,
  type PortableTextBlock,
  type PortableTextSpan,
  toBlogLanguage,
} from "@/lib/blog";
import { getFallbackBlogCover } from "@/lib/blog-covers";

type Params = { lang: string; slug: string };
type TocItem = { id: string; title: string; level: number };

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

  const ogParams = new URLSearchParams({
    title: post.title,
    subtitle: post.excerpt ?? "",
    theme: "light",
  });
  const ogImage = `https://nebutra.com/api/og?${ogParams.toString()}`;

  return {
    title: `${post.title} — Nebutra Blog`,
    description: post.excerpt ?? undefined,
    alternates: {
      canonical: post.contentSource.canonicalUrl ?? localizedPostHref(lang, post.slug),
    },
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
      ?.flatMap((block) =>
        block._type === "code"
          ? [block.code ?? ""]
          : (block.children?.map((child) => child.text ?? "") ?? []),
      )
      .join(" ") ?? "";
  return `${post.title} ${post.excerpt} ${bodyText}`.trim();
}

function getBlockPlainText(block: PortableTextBlock): string {
  if (block._type === "code") return block.code ?? "";
  return (
    block.children
      ?.map((child) => child.text ?? "")
      .join("")
      ?.trim() ?? ""
  );
}

function slugifyHeading(value: string, index: number): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `section-${index + 1}`;
}

function getPostToc(post: BlogPostWithSource): {
  items: TocItem[];
  headingIdByKey: Record<string, string>;
} {
  const items: TocItem[] = [];
  const headingIdByKey: Record<string, string> = {};
  const idCounts = new Map<string, number>();

  for (const block of post.body ?? []) {
    if (block._type !== "block" || !block._key) continue;
    const level = block.style?.match(/^h([2-4])$/)?.[1];
    if (!level) continue;

    const title = getBlockPlainText(block);
    if (!title) continue;

    const baseId = slugifyHeading(title, items.length);
    const count = idCounts.get(baseId) ?? 0;
    idCounts.set(baseId, count + 1);
    const id = count ? `${baseId}-${count + 1}` : baseId;

    headingIdByKey[block._key] = id;
    items.push({ id, title, level: Number(level) });
  }

  return { items, headingIdByKey };
}

function getMarkHref(block: PortableTextBlock, mark: string): string | null {
  const markDef = block.markDefs?.find((def) => def._key === mark);
  return typeof markDef?.href === "string" ? markDef.href : null;
}

function getSpanCopyText(span: PortableTextSpan, block: PortableTextBlock): string {
  let text = span.text ?? "";
  for (const mark of span.marks ?? []) {
    const href = getMarkHref(block, mark);
    if (href) {
      text = `[${text}](${href})`;
    } else if (mark === "code") {
      text = `\`${text}\``;
    } else if (mark === "strong") {
      text = `**${text}**`;
    } else if (mark === "em") {
      text = `*${text}*`;
    }
  }
  return text;
}

function getPortableBlockCopyText(block: PortableTextBlock): string | null {
  if (block._type === "code") {
    const language = block.language?.trim() ?? "";
    return `\`\`\`${language}\n${block.code ?? ""}\n\`\`\``;
  }

  if (block._type !== "block") return null;

  const text =
    block.children
      ?.map((child) => getSpanCopyText(child, block))
      .join("")
      .trim() ?? "";
  if (!text) return null;

  if (block.listItem) {
    const indent = "  ".repeat(Math.max((block.level ?? 1) - 1, 0));
    return block.listItem === "number" ? `${indent}1. ${text}` : `${indent}- ${text}`;
  }

  if (block.style === "h2") return `## ${text}`;
  if (block.style === "h3") return `### ${text}`;
  if (block.style === "h4") return `#### ${text}`;
  if (block.style === "blockquote") return `> ${text}`;

  return text;
}

function getPostCopyText(post: BlogPostWithSource): string {
  const parts = [`# ${post.title}`];
  if (post.excerpt) parts.push(post.excerpt);

  const body =
    post.body?.map(getPortableBlockCopyText).filter((part): part is string => Boolean(part)) ?? [];
  parts.push(...body);

  return parts.join("\n\n").trim();
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

function getContentSourceLabel(post: BlogPostWithSource, isZh: boolean): string {
  if (post.contentSource.kind === "commentary") {
    return isZh ? "Nebutra Commentary" : "Nebutra Commentary";
  }
  if (post.contentSource.kind === "syndicated") {
    return isZh ? "Authorized Syndication" : "Authorized Syndication";
  }
  return "Nebutra Originals";
}

function getOriginalSourceName(post: BlogPostWithSource): string | null {
  return (
    post.contentSource.publisher ??
    post.contentSource.originalAuthor ??
    post.contentSource.originalTitle ??
    null
  );
}

function BlogContentSourceChip({ post, isZh }: { post: BlogPostWithSource; isZh: boolean }) {
  const label = getContentSourceLabel(post, isZh);
  const sourceName = getOriginalSourceName(post);
  const sourceUrl = post.contentSource.originalUrl;

  if (post.contentSource.kind === "original") {
    return (
      <span className="rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-12)]">
        {label}
      </span>
    );
  }

  const content = (
    <>
      <span>{label}</span>
      {sourceName && <span className="text-[var(--neutral-10)]">from {sourceName}</span>}
      {sourceUrl && <External className="size-3" aria-hidden />}
    </>
  );

  if (sourceUrl) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-12)] transition-colors hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)]"
      >
        {content}
      </a>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-12)]">
      {content}
    </span>
  );
}

function BlogSourceNote({ post, isZh }: { post: BlogPostWithSource; isZh: boolean }) {
  if (post.contentSource.kind === "original") return null;

  const sourceName = getOriginalSourceName(post);
  const sourceUrl = post.contentSource.originalUrl;
  const license = post.contentSource.license;

  return (
    <div className="mt-5 max-w-2xl rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-4 text-sm leading-6 text-[var(--neutral-11)]">
      <p className="font-medium text-[var(--neutral-12)]">
        {isZh ? "来源与授权" : "Source and permission"}
      </p>
      <p className="mt-1">
        {isZh ? "本文类型：" : "Content type: "}
        {getContentSourceLabel(post, isZh)}
        {sourceName ? ` · ${sourceName}` : ""}
      </p>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 font-medium text-[var(--neutral-12)] underline decoration-[var(--neutral-7)] underline-offset-4 hover:decoration-[var(--blue-9)]"
        >
          {post.contentSource.originalTitle ?? (isZh ? "查看原文" : "View original")}
          <External className="size-3.5" aria-hidden />
        </a>
      )}
      {license && <p className="mt-1 text-[var(--neutral-10)]">{license}</p>}
    </div>
  );
}

function BlogArticleToc({ items, isZh }: { items: TocItem[]; isZh: boolean }) {
  if (!items.length) return null;

  return (
    <nav
      aria-label={isZh ? "文章目录" : "Article contents"}
      className="border-l border-[var(--neutral-6)] pl-5 text-sm"
    >
      <p className="mb-3 font-medium text-[var(--neutral-12)]">
        {isZh ? "本页目录" : "On this page"}
      </p>
      <ol className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className={item.level > 2 ? "pl-3" : undefined}>
            <a
              href={`#${item.id}`}
              className="line-clamp-2 text-[var(--neutral-10)] transition-colors hover:text-[var(--blue-9)]"
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
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
  const articleCopyText = getPostCopyText(post);
  const { items: tocItems, headingIdByKey } = getPostToc(post);
  const articleUrl = `https://nebutra.com${localizedPostHref(lang, post.slug)}`;

  return (
    <main id="main-content" className="min-h-screen bg-[var(--neutral-1)]">
      <BlogReadingProgress />
      <Navbar />

      <article className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <AnimateIn preset="fade" inView>
          <BlogTransitionLink
            href={localizedPostHref(lang)}
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--neutral-11)] hover:text-[var(--blue-9)] transition-colors rounded"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {isZh ? "全部文章" : "All posts"}
          </BlogTransitionLink>
        </AnimateIn>

        <header className="border-y border-[var(--neutral-6)] py-10 sm:py-12">
          <AnimateIn preset="fadeUp" inView>
            <div className="mb-5 flex flex-wrap gap-1.5">
              <BlogContentSourceChip post={post} isZh={isZh} />
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
                <BlogSourceNote post={post} isZh={isZh} />
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
                <div className="flex flex-wrap gap-2">
                  <BlogCopyButton
                    value={articleCopyText}
                    label={isZh ? "复制原文" : "Copy original"}
                    copiedLabel={isZh ? "已复制" : "Copied"}
                  />
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
            </div>
          </AnimateIn>
        </header>

        {/* Hero image */}
        <AnimateIn preset="fadeUp" inView>
          <div
            style={{ viewTransitionName: `blog-cover-${post.slug}` }}
            className="relative mt-8 h-64 w-full overflow-hidden rounded-[var(--radius-lg)] sm:h-96"
          >
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
          <div className="mx-auto mt-8 max-w-3xl lg:hidden">
            <BlogShareBar
              url={articleUrl}
              title={post.title}
              excerpt={post.excerpt}
              locale={isZh ? "zh" : "en"}
              variant="inline"
            />
          </div>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView>
          <div className="mx-auto mt-10 grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,720px)_240px] lg:items-start">
            <div className="min-w-0" lang={isZh ? "zh" : "en"}>
              <BlogPortableText
                body={post.body}
                copyLabel={isZh ? "复制此段" : "Copy block"}
                copiedLabel={isZh ? "已复制" : "Copied"}
                headingIdByKey={headingIdByKey}
              />
            </div>
            <aside className="sticky top-24 hidden space-y-6 lg:block">
              <BlogShareBar
                url={articleUrl}
                title={post.title}
                excerpt={post.excerpt}
                locale={isZh ? "zh" : "en"}
              />
              <BlogArticleToc items={tocItems} isZh={isZh} />
            </aside>
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
