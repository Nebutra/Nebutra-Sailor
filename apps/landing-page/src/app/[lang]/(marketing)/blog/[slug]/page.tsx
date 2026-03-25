import { ArrowLeft, Calendar } from "@nebutra/icons";
import { getImageUrl } from "@nebutra/sanity/image";
import { getPostBySlug, getPosts } from "@nebutra/sanity/queries";
import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { type Locale, routing } from "@/i18n/routing";

type Params = { lang: string; slug: string };

export async function generateStaticParams() {
  const posts = (await getPosts()) as Array<{ slug: { current: string } }>;

  if (!posts || posts.length === 0) {
    // Next.js requires returning at least one path if we export generateStaticParams.
    // However, if there are no posts, we don't want to generate a fake 404 page.
    // Since dynamicParams = true, returning an empty array is optimal in 14+, but
    // Next 16 explicitly throws EmptyGenerateStaticParamsError.
    // Let's remove generateStaticParams entirely if empty, but we can't do that conditionally.
    // The official workaround is to return a valid path that doesn't 404, or just a dummy.
    // Instead of a dummy, we'll try to let Next-intl's layout handle the empty state,
    // or just pass a known 'empty' slug that the page component intercepts before querying Sanity.
    return routing.locales.map((lang) => ({ lang, slug: "empty-placeholder-do-not-fetch" }));
  }

  return routing.locales.flatMap((lang) =>
    posts.map((post) => ({ lang, slug: post.slug.current })),
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(routing.locales, lang)) return {};

  const post = await getPostBySlug(slug);
  if (!post) return {};

  const ogImage = post.mainImage
    ? getImageUrl(post.mainImage, { width: 1200, height: 630, format: "webp" })
    : undefined;

  return {
    title: `${post.title} — Nebutra Blog`,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `/${lang}/blog/${slug}` },
    openGraph: ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : undefined,
  };
}

type SanityBlock = {
  _type: string;
  _key: string;
  style?: string;
  children?: Array<{ _key: string; text: string; marks?: string[] }>;
};

function renderBody(body: SanityBlock[] | null) {
  if (!body?.length) return null;

  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      {body.map((block) => {
        if (block._type !== "block") return null;

        const text = block.children?.map((c) => c.text).join("") ?? "";

        switch (block.style) {
          case "h2":
            return (
              <h2 key={block._key} className="mt-8 text-2xl font-semibold text-[var(--neutral-12)]">
                {text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={block._key} className="mt-6 text-xl font-semibold text-[var(--neutral-12)]">
                {text}
              </h3>
            );
          case "blockquote":
            return (
              <blockquote
                key={block._key}
                className="mt-4 border-l-4 border-[var(--blue-9)] pl-4 text-[var(--neutral-11)] italic"
              >
                {text}
              </blockquote>
            );
          default:
            return (
              <p key={block._key} className="mt-4 leading-7 text-[var(--neutral-11)]">
                {text}
              </p>
            );
        }
      })}
    </div>
  );
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { lang, slug } = await params;

  if (!hasLocale(routing.locales, lang)) notFound();
  setRequestLocale(lang as Locale);

  if (slug === "empty-placeholder-do-not-fetch") {
    // Return empty placeholder for build optimization if no posts exist yet
    return (
      <main className="min-h-screen bg-white py-24 dark:bg-black">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-2xl font-bold">No posts published yet</h1>
        </div>
      </main>
    );
  }

  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const imageUrl = post.mainImage
    ? getImageUrl(post.mainImage, { width: 1200, height: 630, format: "webp" })
    : null;

  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-black">
      <Navbar />

      <article className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Back link */}
        <AnimateIn preset="fade" inView>
          <Link
            href={`/${lang}/blog`}
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--neutral-11)] hover:text-[var(--blue-9)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-2 rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All posts
          </Link>
        </AnimateIn>

        {/* Categories */}
        {post.categories?.length > 0 && (
          <AnimateIn preset="fadeUp" inView>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {(post.categories as string[]).map((cat) => (
                <span
                  key={cat}
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-[var(--blue-9)]"
                  style={{ background: "var(--blue-3)" }}
                >
                  {cat}
                </span>
              ))}
            </div>
          </AnimateIn>
        )}

        {/* Title */}
        <AnimateIn preset="emerge" inView>
          <h1
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{
              background: "var(--brand-gradient)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {post.title}
          </h1>
        </AnimateIn>

        {/* Meta */}
        <AnimateIn preset="fadeUp" inView>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--neutral-11)]">
            {post.author?.name && (
              <span className="font-medium text-[var(--neutral-12)]">{post.author.name}</span>
            )}
            {date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                <time dateTime={post.publishedAt ?? undefined}>{date}</time>
              </span>
            )}
          </div>
        </AnimateIn>

        {/* Hero image */}
        {imageUrl && (
          <AnimateIn preset="fadeUp" inView>
            <div className="relative mt-8 h-64 w-full overflow-hidden rounded-xl sm:h-80">
              <Image
                src={imageUrl}
                alt={post.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 720px"
              />
            </div>
          </AnimateIn>
        )}

        {/* Excerpt */}
        {post.excerpt && (
          <AnimateIn preset="fadeUp" inView>
            <p className="mt-8 text-lg leading-7 text-[var(--neutral-11)]">{post.excerpt}</p>
          </AnimateIn>
        )}

        {/* Body */}
        <AnimateIn preset="fadeUp" inView>
          <div className="mt-8">{renderBody(post.body as SanityBlock[] | null)}</div>
        </AnimateIn>
      </article>

      <FooterMinimal />
    </main>
  );
}
