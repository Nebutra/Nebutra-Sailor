import {
  type BlogPostWithSource,
  estimateReadTime,
  extractBodyText,
  getBlogUrlSegment,
  getBlogViewTransitionName,
  resolveBlogCover,
  toBlogLanguage,
} from "@nebutra/blog";
import { brand } from "@nebutra/brand/metadata";
import { BookOpen } from "@nebutra/icons";
import { getImageUrl } from "@nebutra/sanity/image";
import { AnimateIn } from "@nebutra/ui/components";
import { format as formatDate } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { BlogIndexExplorer, type BlogIndexPost } from "@/components/landing/blog-index-explorer";
import { type Locale, routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { buildPageMetadata } from "@/lib/seo/metadata";

/**
 * Params outside generateStaticParams render on demand as a blocking route
 * rather than streaming behind a <Suspense> fallback: a streamed page reaches a
 * reader without JavaScript as its fallback (scripts/verify-landing-ssr.mjs).
 */
export const instant = false;

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
  const { lang, tag } = await params;
  const tagLabel = decodeURIComponent(tag);
  if (!hasLocale(routing.locales, lang)) return {};
  // `none` scope: a thin facet over /blog, served but never canonical, so the
  // registry publishes it in zero locales and this is noindex,follow.
  return buildPageMetadata({
    title: `${tagLabel} — ${brand.name} Blog`,
    description: `${brand.name} blog posts tagged ${tagLabel}.`,
    path: `/blog/tag/${tag}`,
    locale: lang as Locale,
  });
}

export default function BlogTagPage({ params }: { params: Promise<Params> }) {
  return <BlogTagPageLoader params={params} />;
}

async function BlogTagPageLoader({ params }: { params: Promise<Params> }) {
  const { lang, tag } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();
  setRequestLocale(lang as Locale);

  const isZh = isZhUiLocale(lang);
  const posts = (await getCachedAllPosts(toBlogLanguage(lang))).filter((post) =>
    post.tags.some((postTag) => matchesSegment(postTag, tag)),
  );
  const tagLabel = decodeURIComponent(tag).replace(/-/g, " ");

  return (
    <main id="main-content" className="flex-1 bg-background">
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <AnimateIn preset="emerge" inView>
          <div className="border-y border-border py-10 sm:py-14">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <BookOpen className="size-3.5" aria-hidden />
              {isZh ? "专题" : "Topic"}
            </div>
            <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">{tagLabel}</h1>
            <p className="mt-4 text-sm text-muted-foreground">
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
    </main>
  );
}
