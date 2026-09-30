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
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NewsArchive, type NewsArchiveItem } from "@/components/landing/news-archive";
import {
  NewsFeatured,
  type NewsFeaturedItem,
  type NewsRailItem,
} from "@/components/landing/news-featured";
import { NewsroomHero } from "@/components/landing/news-hero";
import type { NewsRailSlide } from "@/components/landing/news-rail-carousel";
import { type Locale, routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteLang } from "@/nebutra/i18n";

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
  const t = await getTranslations({ locale: lang, namespace: "newsPage" });
  return buildPageMetadata({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/news",
    locale: lang as Locale,
  });
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

function getCover(post: BlogPostWithSource, width: number, height: number) {
  const imageUrl = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width,
        height,
        format: "webp",
      })
    : null;
  return resolveBlogCover(post, { alt: `${post.title} cover`, imageUrl });
}

function toFeaturedItem(post: BlogPostWithSource, lang: string, isZh: boolean): NewsFeaturedItem {
  const cover = getCover(post, 840, 520);
  return {
    id: post.id,
    title: post.title,
    href: articleHref(lang, post.slug),
    category: getCategory(post),
    dateLabel: formatPostDate(post, isZh),
    excerpt: post.excerpt,
    hasImage: cover.hasImage,
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

function toRailSlide(post: BlogPostWithSource, lang: string): NewsRailSlide {
  const cover = getCover(post, 600, 800);
  return {
    id: post.id,
    href: articleHref(lang, post.slug),
    title: post.title,
    category: getCategory(post),
    hasImage: cover.hasImage,
    imageUrl: cover.src,
    imageAlt: cover.alt,
    fallbackImageUrl: cover.fallbackSrc,
    fallbackImageAlt: cover.fallbackAlt,
    imageBlurDataURL: cover.blurDataURL,
  };
}

export default function NewsPage({ params }: { params: Promise<{ lang: string }> }) {
  return <NewsPageLoader params={params} />;
}

async function NewsPageLoader({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();
  setRequestLocale(lang as Locale);

  const isZh = siteLang(lang) === "zh";
  const t = await getTranslations({ locale: lang, namespace: "newsPage" });
  const posts = await getCachedAllPosts(toBlogLanguage(lang));

  const contactHref = `${localePrefix(lang)}/contact`;
  const rssHref = "/api/changelog/rss";

  const featured = posts[0] ? toFeaturedItem(posts[0], lang, isZh) : null;
  const rail = posts.slice(1, 5).map((post) => toRailItem(post, lang, isZh));
  const archive = posts.map((post) => toArchiveItem(post, lang, isZh));
  // The carousel shows covers; a post without a picture of its own has none to show.
  const railSlides = posts
    .slice(0, 6)
    .map((post) => toRailSlide(post, lang))
    .filter((slide) => slide.hasImage);

  return (
    <main id="main-content" className="flex-1 bg-background">
      <div className="mx-auto max-w-wide px-4 pt-16 sm:px-6 lg:px-8">
        <AnimateIn preset="emerge" inView>
          <NewsroomHero contactHref={contactHref} rssHref={rssHref} isZh={isZh} />
        </AnimateIn>

        {featured ? (
          <>
            <AnimateIn preset="fadeUp" inView>
              <div className="mt-14 border-t border-border pt-14">
                <NewsFeatured featured={featured} rail={rail} />
              </div>
            </AnimateIn>

            <AnimateIn preset="fadeUp" inView>
              <div className="mt-20 border-t border-border pb-24 pt-14">
                <NewsArchive items={archive} railSlides={railSlides} isZh={isZh} />
              </div>
            </AnimateIn>
          </>
        ) : (
          <AnimateIn preset="fadeUp" inView>
            <div className="mt-16 flex flex-col items-center gap-3 border-t border-border py-24 text-center">
              <p className="text-lg font-medium text-foreground">{t("empty.title")}</p>
              <p className="text-sm text-muted-foreground">{t("empty.subtitle")}</p>
            </div>
          </AnimateIn>
        )}
      </div>
    </main>
  );
}
