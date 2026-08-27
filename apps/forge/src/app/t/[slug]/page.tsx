import { buildToolPageModel } from "@nebutra/forge-runtime";
import { Card, PageHeader } from "@nebutra/ui/layout";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageFrame } from "@/components/page-frame";
import { StructuredData } from "@/components/structured-data";
import { ToolWorkspace } from "@/components/tool-workspace";
import { pickBilingual } from "@/lib/bilingual";
import { getForgeRegistry } from "@/lib/registry";
import { buildForgePageMetadata, buildForgeToolJsonLd } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

// Avoid Next 16 SSG flakiness (workStore invariant during multi-locale prerender).
// Tool pages are cheap to SSR; ECS/CF edge cache still applies at the CDN.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const registry = getForgeRegistry();
  if (!registry.has(slug)) {
    return { title: "Tool not found", robots: { index: false, follow: false } };
  }
  const page = buildToolPageModel(registry, slug);
  const locale = await getLocale();
  const description = pickBilingual(locale, page.description);
  const seoTitle = pickBilingual(locale, page.seo.title);
  const keywords = pickBilingual(locale, page.seo.keywords);
  return buildForgePageMetadata({
    title: seoTitle,
    description,
    path: `/t/${slug}`,
    keywords: keywords
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean),
  });
}

/**
 * Tool page: text-width column (max-w-3xl) for focus —
 * breadcrumb → header → workspace → API → related.
 */
export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const registry = getForgeRegistry();
  if (!registry.has(slug)) {
    notFound();
  }
  const page = buildToolPageModel(registry, slug);
  const locale = await getLocale();
  const t = await getTranslations("tool");
  const tNav = await getTranslations("nav");
  const tCat = await getTranslations("categories");
  const categoryLabel = tCat.has(`${page.category}.label` as never)
    ? tCat(`${page.category}.label` as never)
    : page.category;
  const title = pickBilingual(locale, page.title);
  const description = pickBilingual(locale, page.description);

  return (
    <PageFrame width="text" className="py-10 md:py-12" as="article">
      <StructuredData
        id="forge-tool-jsonld"
        data={buildForgeToolJsonLd({
          name: title,
          description,
          path: page.path,
          category: page.category,
        })}
      />
      <div className="space-y-8">
        <div className="space-y-4">
          <nav
            aria-label={t("breadcrumbAria")}
            className="flex flex-wrap items-center gap-2 text-sm text-[var(--neutral-11)]"
          >
            <Link
              href="/"
              className="rounded-[var(--radius-md)] px-1.5 py-0.5 transition hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)]"
            >
              {tNav("tools")}
            </Link>
            <span className="text-[var(--neutral-7)]" aria-hidden>
              /
            </span>
            <Link
              href={`/#${page.category}`}
              className="rounded-[var(--radius-md)] px-1.5 py-0.5 transition hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)]"
            >
              {categoryLabel}
            </Link>
          </nav>

          <PageHeader title={title} description={description} />

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-[var(--neutral-10)]">
            <span>{page.engine.name}</span>
            <span aria-hidden>·</span>
            <span>v{page.engine.version}</span>
            <span aria-hidden>·</span>
            <span className="max-w-[min(100%,28rem)] truncate">{page.engine.upstream}</span>
          </p>
        </div>

        <Card className="border-[var(--neutral-6)] p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-[var(--neutral-6)] pb-4">
            <div>
              <p className="text-sm font-semibold text-[var(--neutral-12)]">{t("workspace")}</p>
              <p className="text-xs text-[var(--neutral-10)]">{t("workspaceHint")}</p>
            </div>
            <code className="rounded-[var(--radius-md)] bg-[var(--neutral-2)] px-2.5 py-1 font-mono text-[11px] text-[var(--neutral-11)]">
              {page.id}
            </code>
          </div>
          <ToolWorkspace slug={page.slug} toolId={page.id} category={page.category} />
        </Card>

        <Card className="border-[var(--neutral-6)] bg-[var(--neutral-2)]/40 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{t("api")}</h2>
            <code className="rounded-[var(--radius-md)] bg-[var(--neutral-1)] px-2.5 py-1 font-mono text-[11px] text-[var(--neutral-11)]">
              {page.meterId}
            </code>
          </div>
          <p className="mb-3 text-sm text-[var(--neutral-11)]">{t("apiHint")}</p>
          <pre className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-4 font-mono text-[11px] leading-relaxed">
            {page.api.exampleCurl}
          </pre>
        </Card>

        {page.related.length > 0 ? (
          <section aria-labelledby="related-tools">
            <h2 id="related-tools" className="mb-3 text-sm font-semibold text-[var(--neutral-12)]">
              {page.compose?.next?.length ? `${t("related")} · next` : t("related")}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {page.related.map((rel) => {
                const isNext = page.compose?.next?.includes(rel.id);
                return (
                  <li key={rel.id}>
                    <Link
                      href={rel.path}
                      className={
                        isNext
                          ? "inline-flex h-9 items-center rounded-full border border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.08)] px-4 text-sm text-[var(--neutral-12)] transition-colors hover:border-[hsl(var(--primary)/0.55)]"
                          : "inline-flex h-9 items-center rounded-full border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-4 text-sm text-[var(--neutral-11)] transition-colors hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)]"
                      }
                    >
                      {isNext ? "→ " : ""}
                      {pickBilingual(locale, rel.title)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </PageFrame>
  );
}
