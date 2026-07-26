import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { type BlogFrontmatter, blog } from "@/lib/articles";
import { seoFor } from "@/lib/seo/alternates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.thinking" });
  return {
    title: t("metadata_title"),
    description: t("metadata_desc"),
    openGraph: {
      images: [
        `/og?title=${encodeURIComponent(t("metadata_title"))}&subtitle=${encodeURIComponent(t("metadata_desc"))}`,
      ],
    },
    ...seoFor("/thinking", locale, "ui"),
  };
}

export default async function ThinkingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.thinking" });

  const articles = blog
    .getPages()
    .map((page) => {
      const data = page.data as unknown as BlogFrontmatter;
      const slug = page.slugs[0] ?? page.url.split("/").pop() ?? "";
      const dateStr =
        data.date instanceof Date ? data.date.toISOString().split("T")[0] : String(data.date ?? "");
      return {
        slug,
        title: data.title ?? "",
        date: dateStr,
        excerpt: data.excerpt ?? "",
        tags: data.tags ?? [],
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="mx-auto max-w-3xl px-6 py-24 md:py-32">
      <div className="mb-16">
        <p className="font-serif italic text-lg text-gray-400 dark:text-gray-500">{t("label")}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          {t("headline")}
        </h1>
      </div>

      {articles.length === 0 && (
        <AnimateIn preset="fade" inView>
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
            <style
              dangerouslySetInnerHTML={{
                __html: `
              @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
            `,
              }}
            />
            <div
              className="w-20 h-20 mx-auto mb-6 opacity-40 dark:opacity-25"
              style={{ animation: "float 4s ease-in-out infinite" }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-full h-full text-gray-400 dark:text-gray-600"
              >
                <path d="M4 4h10a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2z" />
                <path d="M16 8h2a2 2 0 0 1 2 2v12l-4-2" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">{t("empty_title")}</p>
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              {t.rich("empty_subtitle", {
                link: (chunks) => (
                  <Link href="/soul" className="text-[var(--color-accent-dark)] hover:underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
        </AnimateIn>
      )}

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/thinking/${article.slug}`}
            className="group block py-8 transition-colors first:pt-0 last:pb-0 hover:border-[var(--color-accent)]"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <time className="font-mono text-sm text-gray-400 dark:text-gray-500">
                  {article.date}
                </time>
                {article.tags?.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground group-hover:text-[var(--color-accent-dark)] transition-colors">
                {article.title}
              </h2>
              {article.excerpt && (
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                  {article.excerpt}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
