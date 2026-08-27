import { buildRootHub, DEMAND_ROOTS } from "@nebutra/forge-runtime";
import { PageHeader, Section } from "@nebutra/ui/layout";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageFrame } from "@/components/page-frame";
import { ToolCard } from "@/components/tool-card";
import { pickBilingual } from "@/lib/bilingual";
import { getForgeRegistry } from "@/lib/registry";
import { buildForgePageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ root: string }> };

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { root } = await params;
  const registry = getForgeRegistry();
  const hub = buildRootHub(registry, root);
  if (hub.tools.length === 0 && !DEMAND_ROOTS.includes(root as (typeof DEMAND_ROOTS)[number])) {
    return { title: "Root not found" };
  }
  const locale = await getLocale();
  const title = pickBilingual(locale, hub.title);
  const description = pickBilingual(locale, hub.description);
  return buildForgePageMetadata({
    title,
    description,
    path: `/r/${root}`,
  });
}

/**
 * Demand-root hub — SEO + agent IA surface (/r/generator, /r/checker, …).
 */
export default async function RootHubPage({ params }: Props) {
  const { root } = await params;
  const registry = getForgeRegistry();
  const hub = buildRootHub(registry, root);
  if (hub.tools.length === 0) {
    notFound();
  }
  const locale = await getLocale();
  const tNav = await getTranslations("nav");
  const tRoot = await getTranslations("roots");
  const title = pickBilingual(locale, hub.title);
  const description = pickBilingual(locale, hub.description);

  return (
    <PageFrame className="py-10 md:py-12">
      <div className="space-y-8">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-[var(--neutral-11)]">
          <Link
            href="/"
            className="rounded-[var(--radius-md)] px-1.5 py-0.5 transition hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)]"
          >
            {tNav("tools")}
          </Link>
          <span className="text-[var(--neutral-7)]" aria-hidden>
            /
          </span>
          <span className="text-[var(--neutral-12)]">{tRoot("hubLabel")}</span>
        </nav>

        <PageHeader
          title={title}
          description={`${description} · ${hub.tools.length} ${tRoot("tools")}`}
        />

        <p className="font-mono text-xs text-[var(--neutral-10)]">
          root:<span className="text-[var(--neutral-12)]">{hub.root}</span>
          <span className="mx-2 text-[var(--neutral-7)]">·</span>
          {tRoot("dualSurface")}
        </p>

        <Section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hub.tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </Section>

        <section aria-labelledby="other-roots" className="space-y-3">
          <h2 id="other-roots" className="text-sm font-semibold text-[var(--neutral-12)]">
            {tRoot("otherRoots")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {DEMAND_ROOTS.map((r) => {
              const count = buildRootHub(registry, r).tools.length;
              if (count === 0) return null;
              return (
                <li key={r}>
                  <Link
                    href={`/r/${r}`}
                    className={`inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors ${
                      r === hub.root
                        ? "border-primary bg-[var(--blue-3)] text-[var(--neutral-12)]"
                        : "border-[var(--neutral-6)] bg-[var(--neutral-1)] text-[var(--neutral-11)] hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)]"
                    }`}
                  >
                    {r}
                    <span className="ml-1.5 font-mono text-[11px] text-[var(--neutral-10)]">
                      {count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </PageFrame>
  );
}
