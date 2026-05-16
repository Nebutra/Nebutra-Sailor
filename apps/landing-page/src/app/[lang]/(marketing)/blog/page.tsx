import { Calendar } from "@nebutra/icons";
import { getImageUrl } from "@nebutra/sanity/image";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { type Locale, routing } from "@/i18n/routing";
import { type BlogPostWithSource, getAllPosts, toBlogLanguage } from "@/lib/blog";

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
    alternates: { canonical: `/${lang}/blog` },
  };
}

function getAuthorName(author: BlogPostWithSource["author"]): string | null {
  if (!author) return null;
  return typeof author === "string" ? author : (author.name ?? null);
}

function PostCard({ post, lang }: { post: BlogPostWithSource; lang: string }) {
  const isZh = lang === "zh";
  const imageUrl = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width: 800,
        height: 420,
        format: "webp",
      })
    : null;

  const date = post.date
    ? new Date(post.date).toLocaleDateString(isZh ? "zh-CN" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const authorName = getAuthorName(post.author);

  return (
    <Link
      href={`/${lang}/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--neutral-7)] bg-[var(--neutral-1)] transition-shadow hover:shadow-md"
    >
      {/* Cover image */}
      {imageUrl ? (
        <div className="relative h-48 w-full overflow-hidden bg-[var(--neutral-3)]">
          <Image
            src={imageUrl}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-150 group-hover:-translate-y-px"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      ) : (
        <div className="h-48 w-full bg-[var(--neutral-3)]" aria-hidden />
      )}

      <div className="flex flex-1 flex-col p-5">
        {/* Categories */}
        {post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.map((cat) => (
              <span
                key={cat}
                className="rounded-full px-2 py-0.5 text-xs font-medium text-[var(--blue-9)]"
                style={{ background: "var(--blue-3)" }}
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        <h2 className="text-base font-semibold text-[var(--neutral-12)] group-hover:text-[var(--blue-9)] transition-colors">
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--neutral-11)]">
            {post.excerpt}
          </p>
        )}

        <div className="mt-auto flex items-center gap-3 pt-4">
          {date && (
            <span className="flex items-center gap-1 text-xs text-[var(--neutral-10)]">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {date}
            </span>
          )}
          {authorName && (
            <span className="text-xs text-[var(--neutral-10)]">
              {isZh ? "作者 " : "by "}
              {authorName}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function BlogPage({ params }: { params: Promise<{ lang: string }> }) {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");

  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();
  setRequestLocale(lang as Locale);

  const isZh = lang === "zh";
  const posts = await getAllPosts(toBlogLanguage(lang));

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar />

      <section className="mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimateIn preset="emerge" inView>
          <div className="mb-16">
            <h1 className="text-4xl font-bold tracking-tight text-[var(--neutral-12)]">
              {isZh ? "博客" : "Blog"}
            </h1>
            <p className="mt-4 text-[var(--neutral-11)]">
              {isZh
                ? "工程实践、产品进展与 SaaS 架构笔记。"
                : "Engineering insights, product updates, and SaaS best practices."}
            </p>
          </div>
        </AnimateIn>

        {/* Post grid */}
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
                <a
                  href="/api/changelog/rss"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-5 py-2.5 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
                >
                  {isZh ? "订阅 RSS" : "Subscribe via RSS"}
                </a>
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
          <AnimateInGroup stagger="fast" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <AnimateIn key={post.id} preset="fadeUp" inView>
                <PostCard post={post} lang={lang} />
              </AnimateIn>
            ))}
          </AnimateInGroup>
        )}
      </section>

      <FooterMinimal />
    </main>
  );
}
