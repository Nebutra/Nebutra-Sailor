import type { Metadata } from "next";
import Link from "next/link";
import { RegistryCard, type RegistryCardItem } from "@/components/registry/registry-card";
import { RegistryMaturitySummary } from "@/components/registry/registry-maturity-summary";
import { loadRegistryIndex, loadRegistryItem } from "@/lib/registry";
import { getRegistryStrings, REGISTRY_LANGS } from "@/lib/registry-strings";

export const metadata: Metadata = {
  title: "Nebutra UI Registry",
  description:
    "Copy-paste shadcn-compatible components for Next.js. Marketing, dashboards, and data-viz primitives wired to the Nebutra design tokens.",
};

interface PageProps {
  params: Promise<{ lang: string }>;
}

export function generateStaticParams(): { lang: string }[] {
  return REGISTRY_LANGS.map((lang) => ({ lang }));
}

export default async function RegistryIndexPage({ params }: PageProps) {
  const { lang } = await params;
  const t = getRegistryStrings(lang);
  const index = loadRegistryIndex();

  // Hydrate each entry with a small subset of detail-level metadata so the
  // index can render dependency badges without a second client fetch.
  const items: RegistryCardItem[] = index.items.map((entry) => {
    const detail = loadRegistryItem(entry.name);
    return {
      name: entry.name,
      type: entry.type,
      title: entry.title ?? detail?.title ?? entry.name,
      description: entry.description ?? detail?.description,
      layer: detail?.meta?.nebutraLayer,
      maturity: detail?.meta?.docs?.maturity ?? entry.meta?.docs?.maturity,
      dependencies: detail?.dependencies,
      registryDependencies: detail?.registryDependencies,
      cssVarsCount: detail?.meta?.nebutraTokens?.length ?? 0,
    };
  });

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-12 px-4 py-16 md:px-6">
      <header className="flex flex-col gap-3">
        <p className="font-semibold text-primary text-xs uppercase tracking-[0.2em]">
          ui.nebutra.com
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">{t.title}</h1>
        <p className="text-lg text-muted-foreground">{t.subtitle}</p>
        <p className="max-w-3xl text-muted-foreground text-sm">{t.intro}</p>
        <div className="flex gap-3 text-sm">
          <Link href={`/${lang}/docs`} className="text-primary underline-offset-4 hover:underline">
            ← {t.backToDocs}
          </Link>
          <Link href="/registry.json" className="text-primary underline-offset-4 hover:underline">
            registry.json
          </Link>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-border bg-muted p-6 text-muted-foreground text-sm">
          {t.empty}
        </p>
      ) : (
        <>
          <RegistryMaturitySummary items={items} lang={lang} strings={t.maturity} />
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <RegistryCard key={item.name} lang={lang} item={item} />
            ))}
          </section>
        </>
      )}
    </main>
  );
}
