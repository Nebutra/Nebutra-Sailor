import {
  type BlogPostWithSource,
  estimateReadTime,
  getBlogUrlSegment,
  getBlogViewTransitionName,
  resolveBlogCover,
} from "@nebutra/blog";
import { ArrowLeft, ArrowRight, BookOpen, Calendar, Clock, Globe, Message } from "@nebutra/icons";
import { getImageUrl } from "@nebutra/sanity/image";
import { AnimateIn } from "@nebutra/ui/components";
import { DynamicIslandTOC } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar, NewsletterForm } from "@/components/landing";
import { BlogAuthorAvatar } from "@/components/landing/blog-author-avatar";
import { BlogComments } from "@/components/landing/blog-comments";
import { BlogCopyButton } from "@/components/landing/blog-copy-button";
import { BlogImage } from "@/components/landing/blog-image";
import { BlogPortableText } from "@/components/landing/blog-portable-text";
import { BlogShareActions } from "@/components/landing/blog-share-actions";
import { StructuredData } from "@/components/seo/structured-data";
import { prerenderDefaultLocale } from "@/i18n/prerender";
import { type Locale, routing } from "@/i18n/routing";
import {
  buildBlogMetadata,
  EMPTY_BLOG_PLACEHOLDER_SLUG,
  loadCachedBlogArticle,
  localizedPageHref,
  localizedPostHref,
} from "@/lib/blog-page-cache";
import { env } from "@/lib/env";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { unpublishedSet } from "@/lib/seo/site-routes";

type Params = { lang: string; slug: string };

/**
 * Cache Components requires at least one generateStaticParams result. Returning
 * real slugs prerenders them without request IO and trips the current-time
 * guard. The sentinel exists only so the build can validate the route.
 */
export function generateStaticParams() {
  return prerenderDefaultLocale([{ slug: EMPTY_BLOG_PLACEHOLDER_SLUG }], (item) => ({
    slug: item.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang, slug } = await params;
  if (slug === EMPTY_BLOG_PLACEHOLDER_SLUG) {
    return buildPageMetadata({
      title: "Not found — Nebutra Blog",
      description: "This article is not published.",
      path: `/blog/${slug}`,
      locale: lang,
      publishedIn: unpublishedSet(`/blog/${slug}`),
    });
  }
  await connection();
  return buildBlogMetadata(lang, slug);
}

function languageSwitchPostHref(locale: Locale, slug: string): string {
  return localizedPostHref(locale, slug);
}

function postCover(post: BlogPostWithSource) {
  const imageUrl = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width: 720,
        height: 420,
        format: "webp",
      })
    : null;
  return resolveBlogCover(post, { alt: `${post.title} cover`, imageUrl });
}

function BlogArticleFooter({
  isZh,
  lang,
  posts,
}: {
  isZh: boolean;
  lang: string;
  posts: BlogPostWithSource[];
}) {
  return (
    <section className="mx-auto mt-16 max-w-4xl border-y border-border py-10">
      {/* items-start: grid items stretch to the row height by default, so the
          subscribe card grew to match the taller article column and painted its
          bg-muted across the gap — a block of grey with nothing in it. */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {isZh ? "继续阅读" : "Continue reading"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                {isZh ? "同主题文章" : "Related notes"}
              </h2>
            </div>
            <Link
              href={localizedPostHref(lang)}
              className="hidden items-center gap-1.5 text-sm font-medium text-[hsl(var(--primary))] sm:inline-flex"
            >
              {isZh ? "全部文章" : "All posts"}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {posts.map((relatedPost) => {
              const cover = postCover(relatedPost);
              return (
                <Link
                  key={relatedPost.id}
                  href={localizedPostHref(lang, relatedPost.slug)}
                  className="group overflow-hidden rounded-[var(--radius-md)] bg-muted transition-colors hover:bg-muted"
                >
                  <div className="relative h-36 overflow-hidden bg-muted">
                    <BlogImage
                      src={cover.src}
                      alt={cover.alt}
                      fallbackSrc={cover.fallbackSrc}
                      fallbackAlt={cover.fallbackAlt}
                      blurDataURL={cover.blurDataURL}
                      fill
                      sizes="(max-width: 640px) 100vw, 360px"
                      className="object-cover transition-transform duration-200 group-hover:scale-[1.015]"
                    />
                  </div>
                  <div className="p-4">
                    {relatedPost.tags[0] && (
                      <p className="text-xs font-medium text-muted-foreground">
                        {relatedPost.tags[0]}
                      </p>
                    )}
                    <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-foreground">
                      {relatedPost.title}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        <aside className="min-w-0 overflow-hidden rounded-[var(--radius-lg)] bg-muted p-5">
          <p className="text-sm font-semibold text-foreground">
            {isZh ? "订阅 Nebutra Originals" : "Subscribe to Nebutra Originals"}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isZh
              ? "低频、认真，只发产品工程和 AI SaaS 交付笔记。"
              : "Low-frequency notes on product engineering and AI SaaS delivery."}
          </p>
          <div className="mt-4">
            <NewsletterForm />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="#comments"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Message className="size-4" aria-hidden />
              {isZh ? "去评论" : "Discuss"}
            </a>
            <a
              href="#article-share"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {isZh ? "分享" : "Share"}
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (slug === EMPTY_BLOG_PLACEHOLDER_SLUG) notFound();

  return (
    <Suspense fallback={<BlogPostSkeleton />}>
      <BlogPostLoader params={params} />
    </Suspense>
  );
}

async function BlogPostLoader({ params }: { params: Promise<Params> }) {
  const { lang, slug } = await params;

  if (!hasLocale(routing.locales, lang)) notFound();
  if (slug === EMPTY_BLOG_PLACEHOLDER_SLUG) notFound();
  await connection();
  setRequestLocale(lang as Locale);

  const article = await loadCachedBlogArticle(lang, slug);
  if (article.kind === "not-found") notFound();
  if (article.kind === "redirect") redirect(article.href);

  const {
    post,
    blogLanguage,
    isZh,
    date,
    authorName,
    authorAvatarUrl,
    articleCopyText,
    tableOfContents,
    canonicalUrl,
    footerPosts,
    cover,
    fallbackCover,
    imageUrl,
    imageAlt,
    translation,
    translationLocale,
    targetLanguage,
    articleLd,
    breadcrumbLd,
  } = article;

  return (
    <main id="main-content" className="min-h-screen bg-background">
      <StructuredData data={[articleLd, breadcrumbLd]} id="blog-article-jsonld" />
      <Navbar />

      <article className="px-4 pt-24 pb-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <AnimateIn preset="fade" inView>
            <Link
              href={localizedPostHref(lang)}
              className="mb-8 inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-[hsl(var(--primary))]"
            >
              <ArrowLeft className="size-4" aria-hidden />
              {isZh ? "全部文章" : "All posts"}
            </Link>
          </AnimateIn>

          <header className="border-b border-border pb-10 sm:pb-12">
            {post.tags.length > 0 && (
              <AnimateIn preset="fadeUp" inView>
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {post.tags.map((cat) => (
                    <Link
                      key={cat}
                      href={`${localizedPostHref(lang)}/tag/${getBlogUrlSegment(cat)}`}
                      className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {cat}
                    </Link>
                  ))}
                </div>
              </AnimateIn>
            )}

            <AnimateIn preset="emerge" inView>
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <BookOpen className="size-3.5" aria-hidden />
                    {isZh ? "Nebutra 技术博客" : "Nebutra Journal"}
                  </div>
                  <h1 className="max-w-4xl text-4xl font-semibold text-foreground sm:text-5xl lg:text-6xl">
                    {post.title}
                  </h1>
                  {post.excerpt && (
                    <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
                      {post.excerpt}
                    </p>
                  )}
                </div>

                <div className="space-y-5 border-t border-border pt-5 text-sm text-muted-foreground lg:border-t-0 lg:pt-0">
                  <div className="grid gap-2">
                    {authorName && (
                      <Link
                        href={`${localizedPostHref(lang)}/author/${getBlogUrlSegment(authorName)}`}
                        className="inline-flex items-center gap-2 font-medium text-foreground hover:text-[hsl(var(--primary))]"
                      >
                        <BlogAuthorAvatar name={authorName} src={authorAvatarUrl} size="md" />
                        <span>{authorName}</span>
                      </Link>
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
                        hrefLang={isZhUiLocale(targetLanguage) ? "zh-Hans-CN" : "en-US"}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <Globe className="size-4" aria-hidden />
                        {isZhUiLocale(targetLanguage) ? "阅读中文版" : "Read in English"}
                      </a>
                    )}
                  </div>
                  <div id="article-share">
                    <BlogShareActions
                      excerpt={post.excerpt}
                      isZh={isZh}
                      title={post.title}
                      url={canonicalUrl}
                    />
                  </div>
                </div>
              </div>
            </AnimateIn>
          </header>
        </div>

        {/* Hero image */}
        <AnimateIn preset="fadeUp" inView>
          <div className="mx-auto max-w-4xl">
            <div
              className="relative mt-8 aspect-[16/7] min-h-60 w-full overflow-hidden rounded-[var(--radius-lg)] bg-muted sm:min-h-80"
              style={{ viewTransitionName: getBlogViewTransitionName(post.id) }}
            >
              <BlogImage
                src={imageUrl}
                alt={imageAlt}
                fallbackSrc={fallbackCover.src}
                fallbackAlt={fallbackCover.alt}
                blurDataURL={cover.blurDataURL}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 1024px"
              />
            </div>
          </div>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView>
          {/* `data-blog-content` scopes the floating TOC scan to the article body —
              keeps the post <h1>, "Related notes", and comments headings out of the menu. */}
          <div data-blog-content className="mx-auto mt-12 min-w-0 max-w-3xl">
            <BlogPortableText
              body={post.body}
              copyLabel={isZh ? "复制此段" : "Copy block"}
              copiedLabel={isZh ? "已复制" : "Copied"}
              headingIds={tableOfContents.headingIds}
              language={blogLanguage}
              resolveCtaHref={(href) =>
                href === "#contact" ? localizedPageHref(lang, "/contact") : href
              }
            />
          </div>
        </AnimateIn>

        {/* Floating Dynamic Island TOC — only when there's enough structure to navigate,
            mirroring the old sidebar's "hide when < 2 headings" rule. */}
        {tableOfContents.items.length >= 2 && (
          <DynamicIslandTOC
            selector="[data-blog-content] h2, [data-blog-content] h3, [data-blog-content] h4"
            ariaLabel={isZh ? "目录" : "Table of contents"}
            menuHeading={isZh ? "目录" : "Contents"}
            emptyLabel={isZh ? "目录" : "Contents"}
          />
        )}

        {footerPosts.length > 0 && (
          <AnimateIn preset="fadeUp" inView>
            <BlogArticleFooter isZh={isZh} lang={lang} posts={footerPosts} />
          </AnimateIn>
        )}

        <AnimateIn preset="fadeUp" inView>
          <div id="comments" className="mx-auto max-w-3xl scroll-mt-28">
            <BlogComments
              appUrl={env.NEXT_PUBLIC_APP_URL}
              translationKey={post.translationKey ?? post.slug}
              slug={post.slug}
              language={blogLanguage}
              labels={{
                title: isZh ? "讨论" : "Discussion",
                subtitle: isZh
                  ? "使用 Nebutra 账号参与评论。评论会先进入审核队列。"
                  : "Join with your Nebutra account. New comments enter moderation first.",
                empty: isZh ? "还没有评论。来写下第一条。" : "No comments yet. Start the thread.",
                signIn: isZh ? "登录后评论" : "Sign in to comment",
                placeholder: isZh ? "写下你的想法..." : "Share your thought...",
                submit: isZh ? "发布评论" : "Post comment",
                submitting: isZh ? "发布中" : "Posting",
                pending: isZh ? "待审核" : "Pending",
                error: isZh
                  ? "评论暂时不可用，请稍后再试。"
                  : "Comments are unavailable. Try again later.",
                like: isZh ? "点赞" : "Like",
                liked: isZh ? "已点赞" : "Liked",
                save: isZh ? "收藏" : "Save",
                saved: isZh ? "已收藏" : "Saved",
                signInToLike: isZh ? "登录后点赞" : "Sign in to like",
                signInToSave: isZh ? "登录后收藏" : "Sign in to save",
              }}
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
    <main id="main-content" className="min-h-screen bg-background" aria-busy="true">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div className="h-8 w-36 animate-pulse rounded bg-muted" />
        <div className="hidden gap-3 sm:flex">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <article className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-8 h-5 w-28 animate-pulse rounded bg-muted" />
        <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-5 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-8 h-32 w-full animate-pulse rounded bg-muted" />
        <div className="mt-8 space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10/12 animate-pulse rounded bg-muted" />
        </div>
      </article>
      <div className="mx-auto max-w-6xl border-t border-border px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-8 w-36 animate-pulse rounded bg-muted" />
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="h-4 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </main>
  );
}
