import {
  type BlogLanguage,
  type BlogPostWithSource,
  estimateReadTime,
  getBlogRelatedPosts,
  getBlogTableOfContents,
  getBlogUrlSegment,
  getBlogViewTransitionName,
  getFallbackBlogCover,
  getPostCopyText,
  oppositeBlogLanguage,
  resolveBlogCover,
  toBlogLanguage,
} from "@nebutra/blog";
import { ArrowLeft, ArrowRight, BookOpen, Calendar, Clock, Globe, Message } from "@nebutra/icons";
import { getImageUrl } from "@nebutra/sanity/image";
import { AnimateIn } from "@nebutra/ui/components";
import { DynamicIslandTOC } from "@nebutra/ui/primitives";
import { format as dateFnsFormat } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
import { type Locale, routing } from "@/i18n/routing";
import {
  getAllPosts,
  getLocalizedPostForSiblingSlug,
  getPostBySlug,
  getPostTranslation,
} from "@/lib/blog";
import { env } from "@/lib/env";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { localesForPath } from "@/lib/seo/route-registry";
import { getSiteUrl, type PublicationSet } from "@/lib/seo/site-routes";
import { buildArticleSchema, buildBreadcrumbListSchema } from "@/lib/seo/structured-data";

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

  const ogImage = `${getSiteUrl()}${localizedPostHref(lang, post.slug)}/opengraph-image`;

  return buildPageMetadata({
    title: `${post.title} — Nebutra Blog`,
    description: post.excerpt || post.title,
    path: `/blog/${post.slug}`,
    locale: lang as Locale,
    type: "article",
    image: ogImage,
    publishedIn: await blogPublicationSet(post),
  });
}

/**
 * The translation cluster this post belongs to.
 *
 * A translated post lives at a *different slug*, so the cluster has to be
 * assembled from the two real documents rather than reusing this locale's slug
 * for both — the latter fabricates a sibling URL that 404s. A post with no
 * sibling is a legitimate single-member cluster: it exists in one language and
 * says so, instead of claiming a translation that was never written.
 */
async function blogPublicationSet(post: BlogPostWithSource): Promise<PublicationSet> {
  // No `"use cache"` here: the only caller is already inside one, the sibling
  // lookup it makes is separately cached, and a `post` object is not a valid
  // cache key.
  const selfLocale = localeForBlogLanguage(post.language);
  const pathByLocale: Record<string, `/${string}`> = {
    [selfLocale]: `/blog/${post.slug}`,
  };
  const locales: string[] = [selfLocale];

  if (post.translationKey) {
    const sibling = await getCachedPostTranslation(
      post.translationKey,
      oppositeBlogLanguage(post.language),
    );
    if (sibling) {
      const siblingLocale = localeForBlogLanguage(sibling.language);
      if (!locales.includes(siblingLocale)) locales.push(siblingLocale);
      pathByLocale[siblingLocale] = `/blog/${sibling.slug}`;
    }
  }

  // Registry order, so the cluster and the sitemap list the members alike.
  const ordered = localesForPath("/blog/*").filter((locale) => locales.includes(locale));
  const primary = (ordered[0] ?? selfLocale) as string;
  return { path: pathByLocale[primary] as `/${string}`, locales: ordered, pathByLocale };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang, slug } = await params;
  return buildBlogMetadata(lang, slug);
}

function getAuthorName(author: BlogPostWithSource["author"]): string | null {
  if (!author) return null;
  return typeof author === "string" ? author : (author.name ?? null);
}

function getAuthorAvatarUrl(author: BlogPostWithSource["author"]): string | null {
  if (!author || typeof author === "string" || !author.image) return null;
  return getImageUrl(author.image, { width: 96, height: 96, format: "webp" });
}

function localizedPostHref(locale: string, slug?: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return slug ? `${prefix}/blog/${slug}` : `${prefix}/blog`;
}

function localizedPageHref(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${prefix}${path}`;
}

function languageSwitchPostHref(locale: Locale, slug: string): string {
  return `/${locale}/blog/${slug}`;
}

function localeForBlogLanguage(language: BlogLanguage): Locale {
  // Content language "zh" maps to Simplified Chinese product locale (CLDR Hans).
  return language === "zh" ? "zh-Hans" : "en";
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

async function getCachedAllPosts(language: BlogLanguage): Promise<BlogPostWithSource[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  return getAllPosts(language);
}

async function getCachedPostTranslation(
  translationKey: string,
  language: BlogLanguage,
): Promise<BlogPostWithSource | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  cacheTag(`blog-translation:${translationKey}`);
  return getPostTranslation(translationKey, language);
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
  const isZh = isZhUiLocale(lang);
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
  const primaryImageUrl = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width: 1200,
        height: 630,
        format: "webp",
      })
    : null;
  const cover = resolveBlogCover(post, { alt: `${post.title} cover`, imageUrl: primaryImageUrl });
  const imageUrl = cover.src;
  const imageAlt = cover.alt;

  const date = (() => {
    if (!post.date) return null;
    const d = new Date(post.date);
    if (Number.isNaN(d.getTime())) return null;
    return dateFnsFormat(
      d,
      isZh ? "yyyy年M月d日" : "MMMM d, yyyy",
      isZh ? { locale: zhCN } : undefined,
    );
  })();
  const authorName = getAuthorName(post.author);
  const authorAvatarUrl = getAuthorAvatarUrl(post.author);
  const articleCopyText = getPostCopyText(post);
  const tableOfContents = getBlogTableOfContents(post.body);
  const canonicalUrl = `${getSiteUrl()}${localizedPostHref(lang, post.slug)}`;
  const allPosts = await getCachedAllPosts(blogLanguage);
  const relatedPosts = getBlogRelatedPosts(allPosts, post, 2);
  const footerPosts =
    relatedPosts.length > 0
      ? relatedPosts
      : allPosts.filter((candidate) => candidate.slug !== post.slug).slice(0, 2);

  const articleLd = buildArticleSchema({
    headline: post.title,
    description: post.excerpt || post.title,
    url: canonicalUrl,
    image: imageUrl ?? undefined,
    datePublished: post.date ?? new Date().toISOString(),
    dateModified: post.updatedAt ?? post.date,
    author: authorName ? { name: authorName } : undefined,
    publisher: {
      name: "Nebutra",
      logo: `${getSiteUrl()}/icon.png`,
    },
  });
  const breadcrumbLd = buildBreadcrumbListSchema([
    { name: "Home", url: `${getSiteUrl()}/${lang}` },
    { name: "Blog", url: `${getSiteUrl()}${localizedPostHref(lang)}` },
    { name: post.title, url: canonicalUrl },
  ]);

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
