import { ArrowLeft, ArrowRight } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { type BlogFrontmatter, blog, getReadingTime } from "@/lib/articles";
import { articleJsonLd } from "@/lib/json-ld";

export function generateStaticParams() {
  return blog.getPages().map((page) => ({
    slug: page.slugs[0] ?? page.url.split("/").pop() ?? "",
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const page = blog.getPage([slug]);
  if (!page) return {};

  const data = page.data as unknown as BlogFrontmatter;
  const { title, excerpt } = data;
  return {
    title,
    description: excerpt,
    alternates: {
      canonical: `https://tsekaluk.dev/${locale}/thinking/${slug}`,
      languages: {
        en: `https://tsekaluk.dev/en/thinking/${slug}`,
        zh: `https://tsekaluk.dev/zh/thinking/${slug}`,
        ja: `https://tsekaluk.dev/ja/thinking/${slug}`,
      },
    },
    openGraph: {
      title,
      description: excerpt,
      images: [
        {
          url: `https://tsekaluk.dev/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(excerpt)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "nav" });
  const page = blog.getPage([slug]);
  if (!page) notFound();

  const data = page.data as unknown as BlogFrontmatter;
  const { title, date, tags, excerpt } = data;
  const MDXContent = data.body;
  const readingTime = getReadingTime(slug);

  const dateStr = date instanceof Date ? date.toISOString().split("T")[0] : String(date);

  // Prev / next navigation
  const allPages = blog
    .getPages()
    .map((p) => {
      const d = p.data as unknown as BlogFrontmatter;
      const s = p.slugs[0] ?? p.url.split("/").pop() ?? "";
      const ds = d.date instanceof Date ? d.date.toISOString().split("T")[0] : String(d.date);
      return { slug: s, title: d.title, date: ds };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const idx = allPages.findIndex((p) => p.slug === slug);
  const prevPage = idx > 0 ? allPages[idx - 1] : null;
  const nextPage = idx < allPages.length - 1 ? allPages[idx + 1] : null;

  return (
    <section className="mx-auto max-w-2xl px-6 py-24 md:py-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            articleJsonLd({ title, slug, date: dateStr, excerpt: excerpt ?? "" }),
          ),
        }}
      />
      {/* Back link */}
      <AnimateIn preset="fade">
        <Link
          href="/thinking"
          className="mb-12 inline-flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("thinking")}
        </Link>
      </AnimateIn>

      {/* Header */}
      <AnimateIn preset="fadeUp" delay={0.08}>
        <div className="mb-10">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <time dateTime={dateStr} className="font-mono text-sm text-gray-400 dark:text-gray-500">
              {dateStr}
            </time>
            <span className="font-mono text-sm text-gray-400 dark:text-gray-500">
              {readingTime} min read
            </span>
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">{title}</h1>
          {excerpt && (
            <p className="mt-4 font-serif italic text-lg text-gray-400 dark:text-gray-500 leading-relaxed">
              {excerpt}
            </p>
          )}
        </div>
      </AnimateIn>

      {/* MDX content */}
      <AnimateIn preset="fadeUp" delay={0.15} inView>
        <article className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-[var(--color-accent-dark)] prose-a:no-underline hover:prose-a:underline prose-hr:border-gray-200 dark:prose-hr:border-gray-800">
          <MDXContent />
        </article>
      </AnimateIn>

      {/* Prev / next navigation */}
      {(prevPage ?? nextPage) && (
        <AnimateIn preset="fade" delay={0.2} inView>
          <nav
            aria-label="Article navigation"
            className="mt-16 pt-8 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4"
          >
            {prevPage ? (
              <Link
                href={`/thinking/${prevPage.slug}`}
                className="group flex flex-col gap-1 rounded-xl border border-gray-100 dark:border-gray-800 p-4 transition-colors hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/50"
              >
                <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                  <ArrowLeft className="h-3 w-3" /> Previous
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-foreground line-clamp-2">
                  {prevPage.title}
                </span>
              </Link>
            ) : (
              <div />
            )}

            {nextPage ? (
              <Link
                href={`/thinking/${nextPage.slug}`}
                className="group flex flex-col gap-1 rounded-xl border border-gray-100 dark:border-gray-800 p-4 transition-colors hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/50 text-right col-start-2"
              >
                <span className="inline-flex items-center justify-end gap-1 text-xs text-gray-400 dark:text-gray-500">
                  Next <ArrowRight className="h-3 w-3" />
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-foreground line-clamp-2">
                  {nextPage.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
          </nav>
        </AnimateIn>
      )}
    </section>
  );
}
