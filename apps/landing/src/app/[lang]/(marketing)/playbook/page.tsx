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
import { pick } from "@/lib/i18n/localized";
import { buildPageMetadata } from "@/lib/seo/metadata";

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
  return buildPageMetadata({
    title: "Playbook — Nebutra Sailor",
    description: pick(
      {
        en: "A curated directory of the infrastructure demos, utilities, integrations and experimental features that ship inside Sailor.",
        zh: "Sailor 内置的基础设施 Demo、实用工具、集成能力与实验性功能的精选目录。",
      },
      lang,
    ),
    path: "/playbook",
    locale: lang as Locale,
  });
}

function PlaybookCard({ item, locale }: { item: PlaybookItem; locale: string }) {
  const Icon = item.icon;
  const href = resolvePlaybookHref(item);
  const external = isPlaybookExternal(item);

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-neutral-3 text-neutral-11 transition-colors group-hover:bg-primary/10 group-hover:text-primary dark:group-hover:bg-primary/15 dark:group-hover:text-primary">
          <Icon className="size-[18px]" />
        </span>
        {external ? (
          <ExternalLink className="size-4 shrink-0 text-neutral-9 transition-colors group-hover:text-primary dark:group-hover:text-[color:var(--brand-accent)]" />
        ) : (
          <ArrowRight className="size-4 shrink-0 text-neutral-9 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:group-hover:translate-x-0 dark:group-hover:text-[color:var(--brand-accent)]" />
        )}
      </div>
      <div className="mt-4">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-neutral-12">{pick(item.title, locale)}</h3>
          {item.badge && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary dark:bg-primary/15 dark:text-primary">
              {pick(item.badge, locale)}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-11">
          {pick(item.description, locale)}
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

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-32 sm:px-6">
        <AnimateIn preset="fadeUp">
          <div className="text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-neutral-11">
              {pick({ en: "Playbook", zh: "实战手册" }, lang)}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-neutral-12 sm:text-5xl">
              {pick({ en: "See the infrastructure run", zh: "把基础设施跑给你看" }, lang)}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-11">
              {pick(
                {
                  en: "The infrastructure demos, utilities, integrations and experiments that ship inside Sailor — pick one and dive in.",
                  zh: "Sailor 内置的基础设施 Demo、实用工具、集成能力与实验性功能——挑一个直接上手。",
                },
                lang,
              )}
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
                      {pick(category.label, lang)}
                    </h2>
                    <p className="mt-1 text-sm text-neutral-11">
                      {pick(category.description, lang)}
                    </p>
                  </div>
                </AnimateIn>
                <AnimateInGroup stagger="fast" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <AnimateIn key={item.id} preset="fadeUp">
                      <PlaybookCard item={item} locale={lang} />
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
