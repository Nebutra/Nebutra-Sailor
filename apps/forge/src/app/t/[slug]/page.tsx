import { buildToolPageModel } from "@nebutra/forge-runtime";
import { Card, PageHeader } from "@nebutra/ui/layout";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LabBadge } from "@/components/lab-badge";
import { PageFrame } from "@/components/page-frame";
import { ToolWorkspace } from "@/components/tool-workspace";
import { categoryMeta } from "@/lib/category-meta";
import { getForgeRegistry } from "@/lib/registry";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getForgeRegistry()
    .list()
    .map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const registry = getForgeRegistry();
  if (!registry.has(slug)) {
    return { title: "Tool not found" };
  }
  const page = buildToolPageModel(registry, slug);
  const isLab = page.sotaStatus === "lab";
  return {
    title: isLab ? `${page.title.zh}（实验）- 在线工具 | Nebutra Forge` : page.seo.title.zh,
    description: isLab
      ? `${page.description.zh}（实验能力，数据范围有限，仅供参考）`
      : page.description.zh,
    keywords: page.seo.keywords.zh.split(","),
  };
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
  const cat = categoryMeta(page.category);
  const isLab = page.sotaStatus === "lab";

  return (
    <PageFrame width="text" className="py-10 md:py-12" as="article">
      <div className="space-y-8">
        <div className="space-y-4">
          <nav
            aria-label="面包屑"
            className="flex flex-wrap items-center gap-2 text-sm text-[var(--neutral-11)]"
          >
            <Link
              href="/"
              className="rounded-[var(--radius-md)] px-1.5 py-0.5 transition hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)]"
            >
              工具
            </Link>
            <span className="text-[var(--neutral-7)]" aria-hidden>
              /
            </span>
            <Link
              href={`/#${page.category}`}
              className="rounded-[var(--radius-md)] px-1.5 py-0.5 transition hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)]"
            >
              {cat.label}
            </Link>
            {isLab ? <LabBadge className="ml-1" /> : null}
          </nav>

          <PageHeader title={page.title.zh} description={page.description.zh} />

          {isLab ? (
            <p className="rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--status-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--status-warning)_8%,transparent)] px-3 py-2 text-sm text-[var(--neutral-11)]">
              实验能力：数据范围或词典有限，结果仅供参考，不承诺完整生产精度。
            </p>
          ) : null}

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
              <p className="text-sm font-semibold text-[var(--neutral-12)]">工作台</p>
              <p className="text-xs text-[var(--neutral-10)]">本地或服务端 · 与 API 同一路径</p>
            </div>
            <code className="rounded-[var(--radius-md)] bg-[var(--neutral-2)] px-2.5 py-1 font-mono text-[11px] text-[var(--neutral-11)]">
              {page.id}
            </code>
          </div>
          <ToolWorkspace slug={page.slug} toolId={page.id} category={page.category} />
        </Card>

        <Card className="border-[var(--neutral-6)] bg-[var(--neutral-2)]/40 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">API</h2>
            <code className="rounded-[var(--radius-md)] bg-[var(--neutral-1)] px-2.5 py-1 font-mono text-[11px] text-[var(--neutral-11)]">
              {page.meterId}
            </code>
          </div>
          <p className="mb-3 text-sm text-[var(--neutral-11)]">
            与页面同一调用契约。生产环境请走认证 Key。
          </p>
          <pre className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-4 font-mono text-[11px] leading-relaxed">
            {page.api.exampleCurl}
          </pre>
        </Card>

        {page.related.length > 0 ? (
          <section aria-labelledby="related-tools">
            <h2 id="related-tools" className="mb-3 text-sm font-semibold text-[var(--neutral-12)]">
              相关工具
            </h2>
            <ul className="flex flex-wrap gap-2">
              {page.related.map((t) => (
                <li key={t.id}>
                  <Link
                    href={t.path}
                    className="inline-flex h-9 items-center rounded-full border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-4 text-sm text-[var(--neutral-11)] transition-colors hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)]"
                  >
                    {t.title.zh}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </PageFrame>
  );
}
