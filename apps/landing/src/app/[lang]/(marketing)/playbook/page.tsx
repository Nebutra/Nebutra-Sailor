import { ArrowRight, External as ExternalLink } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import {
  isPlaybookExternal,
  PLAYBOOK_CATEGORIES,
  PLAYBOOK_ITEMS,
  type PlaybookItem,
  resolvePlaybookHref,
} from "@/lib/constants/playbook-data";
import { buildPageMetadata } from "@/lib/seo/metadata";

/** Reads a dynamic dotted path out of `playbookCatalog` — the category/item id is data, not a literal key. */
type CatalogTranslator = (key: string) => string;

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
  const t = await getTranslations({ locale: lang, namespace: "playbookCatalog.meta" });
  return buildPageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/playbook",
    locale: lang as Locale,
  });
}

function PlaybookCard({ item, t }: { item: PlaybookItem; t: CatalogTranslator }) {
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
          <h3 className="text-[15px] font-semibold text-neutral-12">
            {t(`items.${item.id}.title`)}
          </h3>
          {item.badge && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary dark:bg-primary/15 dark:text-primary">
              {t(`items.${item.id}.badge`)}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-11">
          {t(`items.${item.id}.description`)}
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

  const t = (await getTranslations({
    locale: lang,
    namespace: "playbookCatalog",
  })) as unknown as CatalogTranslator;

  return (
    <main className="mx-auto w-full max-w-wide px-4 pb-24 pt-32 sm:px-6 flex-1">
      <AnimateIn preset="fadeUp">
        <div className="text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-neutral-11">
            {t("page.eyebrow")}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-neutral-12 sm:text-5xl">
            {t("page.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-11">{t("page.lead")}</p>
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
                    {t(`categories.${category.id}.label`)}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-11">
                    {t(`categories.${category.id}.description`)}
                  </p>
                </div>
              </AnimateIn>
              <AnimateInGroup stagger="fast" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <AnimateIn key={item.id} preset="fadeUp">
                    <PlaybookCard item={item} t={t} />
                  </AnimateIn>
                ))}
              </AnimateInGroup>
            </section>
          );
        })}
      </div>
    </main>
  );
}
