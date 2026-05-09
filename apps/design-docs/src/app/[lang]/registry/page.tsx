import type { Metadata } from "next";
import Link from "next/link";
import { RegistryCard, type RegistryCardItem } from "@/components/registry/registry-card";
import { loadRegistryIndex, loadRegistryItem } from "@/lib/registry";

export const metadata: Metadata = {
  title: "Nebutra UI Registry",
  description:
    "Copy-paste shadcn-compatible components for Next.js. Marketing, dashboards, and data-viz primitives wired to the Nebutra design tokens.",
};

interface PageProps {
  params: Promise<{ lang: string }>;
}

const STRINGS: Record<string, { title: string; subtitle: string; intro: string; empty: string }> = {
  en: {
    title: "Nebutra UI Registry",
    subtitle: "Copy-paste components, wired to the Nebutra design system.",
    intro:
      "Every component below ships as a shadcn registry manifest with its source, dependencies, and the CSS variables it consumes. Run the install command in any Next.js project that has shadcn-cli configured.",
    empty:
      "No registry items found. Run pnpm --filter @nebutra/ui build:registry to populate apps/design-docs/public/r/.",
  },
  zh: {
    title: "Nebutra UI 组件市集",
    subtitle: "Copy-paste 组件库，原生绑定 Nebutra 设计系统。",
    intro:
      "每个组件都以 shadcn registry 清单的形式发布，附带源码、依赖和 CSS 变量。在配置好 shadcn-cli 的 Next.js 项目中运行下方安装命令即可使用。",
    empty:
      "暂无 registry 条目，请运行 pnpm --filter @nebutra/ui build:registry 生成 apps/design-docs/public/r/ 下的清单。",
  },
};

export default async function RegistryIndexPage({ params }: PageProps) {
  const { lang } = await params;
  const t = STRINGS[lang] ?? STRINGS.en;
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
      dependencies: detail?.dependencies,
      registryDependencies: detail?.registryDependencies,
      cssVarsCount: detail?.meta?.nebutraTokens?.length ?? 0,
    };
  });

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-12 px-4 py-16 md:px-6">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--blue-9)]">
          ui.nebutra.com
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--neutral-12)]">{t.title}</h1>
        <p className="text-lg text-[var(--neutral-11)]">{t.subtitle}</p>
        <p className="max-w-3xl text-sm text-[var(--neutral-11)]">{t.intro}</p>
        <div className="flex gap-3 text-sm">
          <Link
            href={`/${lang}/docs`}
            className="text-[var(--blue-9)] underline-offset-4 hover:underline"
          >
            ← {lang === "zh" ? "返回设计系统文档" : "Back to design system docs"}
          </Link>
          <a
            href="/registry.json"
            className="text-[var(--blue-9)] underline-offset-4 hover:underline"
          >
            registry.json
          </a>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-6 text-sm text-[var(--neutral-11)]">
          {t.empty}
        </p>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <RegistryCard key={item.name} lang={lang} item={item} />
          ))}
        </section>
      )}
    </main>
  );
}
