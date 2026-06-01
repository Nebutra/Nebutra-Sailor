import { ArrowRight, External as ExternalLink } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import {
  isPlaybookExternal,
  PLAYBOOK_CATEGORIES,
  PLAYBOOK_ITEMS,
  type PlaybookItem,
  resolvePlaybookHref,
} from "@/lib/constants/playbook-data";

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
  const zh = lang === "zh";
  return {
    title: "Playbook — Nebutra Sailor",
    description: zh
      ? "Sailor 内置的基础设施 Demo、实用工具、集成能力与实验性功能的精选目录。"
      : "A curated directory of the infrastructure demos, utilities, integrations and experimental features that ship inside Sailor.",
    alternates: { canonical: `/${lang}/playbook` },
  };
}

function PlaybookCard({ item, zh }: { item: PlaybookItem; zh: boolean }) {
  const Icon = item.icon;
  const href = resolvePlaybookHref(item);
  const external = isPlaybookExternal(item);

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-neutral-3 text-neutral-11 transition-colors group-hover:bg-blue-3 group-hover:text-blue-11 dark:group-hover:bg-blue-9/20 dark:group-hover:text-blue-9">
          <Icon className="size-[18px]" />
        </span>
        {external ? (
          <ExternalLink className="size-4 shrink-0 text-neutral-9 transition-colors group-hover:text-blue-10 dark:group-hover:text-cyan-9" />
        ) : (
          <ArrowRight className="size-4 shrink-0 text-neutral-9 transition-all group-hover:translate-x-0.5 group-hover:text-blue-10 dark:group-hover:text-cyan-9" />
        )}
      </div>
      <div className="mt-4">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-neutral-12">
            {zh ? item.title.zh : item.title.en}
          </h3>
          {item.badge && (
            <span className="rounded-full bg-blue-3 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-11 dark:bg-blue-9/20 dark:text-blue-9">
              {zh ? item.badge.zh : item.badge.en}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-11">
          {zh ? item.description.zh : item.description.en}
        </p>
      </div>
    </>
  );

  const className =
    "group flex h-full flex-col rounded-[var(--radius-xl)] border border-neutral-7 bg-neutral-1 p-5 transition-shadow hover:shadow-lg";

  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

export default async function PlaybookPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return null;
  setRequestLocale(lang as Locale);
  const zh = lang === "zh";

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-32 sm:px-6">
        <AnimateIn preset="fadeUp">
          <div className="text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-neutral-11">
              {zh ? "实战手册" : "Playbook"}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-neutral-12 sm:text-5xl">
              {zh ? "把基础设施跑给你看" : "See the infrastructure run"}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-11">
              {zh
                ? "Sailor 内置的基础设施 Demo、实用工具、集成能力与实验性功能——挑一个直接上手。"
                : "The infrastructure demos, utilities, integrations and experiments that ship inside Sailor — pick one and dive in."}
            </p>
          </div>
        </AnimateIn>

        <div className="mt-16 flex flex-col gap-16">
          {PLAYBOOK_CATEGORIES.map((category) => {
            const items = PLAYBOOK_ITEMS.filter((item) => item.category === category.id);
            if (items.length === 0) return null;
            return (
              <section key={category.id}>
                <AnimateIn preset="fadeUp">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-neutral-12">
                      {zh ? category.label.zh : category.label.en}
                    </h2>
                    <p className="mt-1 text-sm text-neutral-11">
                      {zh ? category.description.zh : category.description.en}
                    </p>
                  </div>
                </AnimateIn>
                <AnimateInGroup stagger="fast" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <AnimateIn key={item.id} preset="fadeUp">
                      <PlaybookCard item={item} zh={zh} />
                    </AnimateIn>
                  ))}
                </AnimateInGroup>
              </section>
            );
          })}
        </div>
      </main>
      <FooterMinimal />
    </>
  );
}
