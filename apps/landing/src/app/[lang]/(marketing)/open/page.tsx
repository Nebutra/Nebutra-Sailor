import { ArrowRight, External as ExternalLink } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Button } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Locale, routing } from "@/i18n/routing";
import {
  isOpenPlatformExternal,
  OPEN_PLATFORM_GROUPS,
  OPEN_PLATFORM_ITEMS,
  type OpenPlatformItem,
  resolveOpenPlatformConsoleHref,
  resolveOpenPlatformHref,
} from "@/lib/constants/open-platform";
import { buildPageMetadata } from "@/lib/seo/metadata";

/** Reads a dynamic dotted path out of `openPlatform` — the group/item id is data, not a literal key. */
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
  const t = await getTranslations({ locale: lang, namespace: "openPlatform" });
  return buildPageMetadata({
    title: t("title"),
    description: t("lead"),
    path: "/open",
    locale: lang as Locale,
  });
}

function CatalogCard({ item, t }: { item: OpenPlatformItem; t: CatalogTranslator }) {
  const Icon = item.icon;
  const href = resolveOpenPlatformHref(item);
  const external = isOpenPlatformExternal(item);

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
          {item.badge ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary dark:bg-primary/15 dark:text-primary">
              {t(`items.${item.id}.badge`)}
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-11">
          {t(`items.${item.id}.description`)}
        </p>
      </div>
    </>
  );

  const className =
    "group flex h-full flex-col rounded-[var(--radius-xl)] border border-neutral-7 bg-neutral-1 p-5 transition-[border-color,box-shadow] duration-flow ease-out hover:border-neutral-8 hover:shadow-ambient-sm";

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={className}
    >
      {inner}
    </a>
  );
}

export default async function OpenPlatformPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return null;
  setRequestLocale(lang as Locale);

  const t = (await getTranslations({
    locale: lang,
    namespace: "openPlatform",
  })) as unknown as CatalogTranslator;

  return (
    <main id="main-content" className="mx-auto w-full max-w-wide px-4 pb-24 pt-32 sm:px-6 flex-1">
      <AnimateIn preset="fadeUp">
        <div className="text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-neutral-11">
            {t("eyebrow")}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-neutral-12 sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-11">{t("lead")}</p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Button asChild size="lg">
              <a href={resolveOpenPlatformConsoleHref()}>
                {t("consoleCta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <p className="max-w-xl text-sm text-neutral-11">{t("consoleHint")}</p>
          </div>
        </div>
      </AnimateIn>

      <div className="mt-16 flex flex-col gap-16">
        {OPEN_PLATFORM_GROUPS.map((group) => {
          const items = OPEN_PLATFORM_ITEMS.filter((item) => item.group === group.id);
          if (items.length === 0) return null;
          return (
            <section key={group.id} aria-labelledby={`open-${group.id}`}>
              <AnimateIn preset="fadeUp">
                <div className="mb-6">
                  <h2 id={`open-${group.id}`} className="text-xl font-semibold text-neutral-12">
                    {t(`groups.${group.id}.label`)}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-11">
                    {t(`groups.${group.id}.description`)}
                  </p>
                </div>
              </AnimateIn>
              <AnimateInGroup stagger="fast" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <AnimateIn key={item.id} preset="fadeUp">
                    <CatalogCard item={item} t={t} />
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
