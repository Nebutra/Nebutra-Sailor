import { Calendar } from "@nebutra/icons";
import { getImageUrl } from "@nebutra/sanity/image";
import { getPosts } from "@nebutra/sanity/queries";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { type Locale, routing } from "@/i18n/routing";

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
  return {
    title: "Blog — Nebutra",
    description:
      "Engineering insights, product updates, and SaaS best practices from the Nebutra team.",
    alternates: { canonical: `/${lang}/blog` },
  };
}

type SanityPost = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string | null;
  excerpt: string | null;
  mainImage: unknown;
  author: string | null;
  categories: string[] | null;
};

function PostCard({ post, lang }: { post: SanityPost; lang: string }) {
  const imageUrl = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width: 800,
        height: 420,
        format: "webp",
      })
    : null;

  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Link
      href={`/${lang}/blog/${post.slug.current}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--neutral-7)] bg-[var(--neutral-1)] transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-2"
    >
      {/* Cover image */}
      {imageUrl ? (
        <div className="relative h-48 w-full overflow-hidden bg-[var(--neutral-3)]">
          <Image
            src={imageUrl}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      ) : (
        <div className="h-48 w-full" style={{ background: "var(--brand-gradient)" }} aria-hidden />
      )}

      <div className="flex flex-1 flex-col p-5">
        {/* Categories */}
        {post.categories && post.categories.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.categories.map((cat) => (
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
          {post.author && (
            <span className="text-xs text-[var(--neutral-10)]">by {post.author}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function BlogPage({ params }: { params: Promise<{ lang: string }> }) {
  "use cache";
  cacheLife("hours");

  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const posts = (await getPosts()) as SanityPost[];

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-black">
      <Navbar />

      <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimateIn preset="emerge" inView>
          <div className="mb-16">
            <h1
              className="text-4xl font-bold tracking-tight"
              style={{
                background: "var(--brand-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Blog
            </h1>
            <p className="mt-4 text-[var(--neutral-11)]">
              Engineering insights, product updates, and SaaS best practices.
            </p>
          </div>
        </AnimateIn>

        {/* Post grid */}
        {posts.length === 0 ? (
          <AnimateIn preset="fadeUp" inView>
            <div className="flex flex-col items-center gap-3 py-24 text-center">
              <p className="text-lg font-medium text-[var(--neutral-12)]">Coming soon</p>
              <p className="text-sm text-[var(--neutral-11)]">
                Our first articles are on the way. Follow{" "}
                <a
                  href="https://x.com/nebutra_ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--blue-9)] underline-offset-4 hover:underline"
                >
                  @nebutra_ai
                </a>{" "}
                for updates.
              </p>
            </div>
          </AnimateIn>
        ) : (
          <AnimateInGroup stagger="fast" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <AnimateIn key={post._id} preset="fadeUp" inView>
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
