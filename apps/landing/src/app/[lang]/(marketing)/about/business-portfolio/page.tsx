import { ArrowRight, Box as Boxes, Cpu, Database, Shield } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { Button } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { CAPABILITY_GROUPS } from "../_about-data";

// Map group keys to icons for a consistent visual anchor.
const GROUP_ICONS: Record<string, typeof Boxes> = {
  modality: Boxes,
  technology: Cpu,
  platform: Database,
  governance: Shield,
};

// ─── generateMetadata ────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  setRequestLocale(lang as Locale);
  const t = await getTranslations({ locale: lang, namespace: "aboutPages.businessPortfolio" });
  return buildPageMetadata({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/about/business-portfolio",
    locale: lang as Locale,
  });
}

// ─── Page component ──────────────────────────────────────────────────────────
export default async function BusinessPortfolioPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);
  const t = await getTranslations({ locale: lang, namespace: "aboutPages.businessPortfolio" });

  // Stats pulled directly from CAPABILITY_GROUPS — kept in-sync with source data.
  const stats = CAPABILITY_GROUPS.map((g) => ({
    key: g.key,
    count: g.items.length,
    label: t(`groups.${g.key}.title`),
  }));
  const totalCount = stats.reduce((sum, s) => sum + s.count, 0);

  return (
    <main id="main-content" className="flex flex-col flex-1 bg-background">
      {/* ─── Section 1 · Hero ─────────────────────────────────────────────── */}
      <section className="pt-32 md:pt-48 pb-20 md:pb-24 border-b border-border/50">
        <div className="container mx-auto px-4 max-w-wide">
          <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-8 block">
            {t("hero.kicker")}
          </span>

          <AnimateIn preset="fadeUp">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-balance mb-8 max-w-4xl"
              style={{
                letterSpacing: "var(--tracking-display)",
                lineHeight: "var(--leading-display)",
              }}
            >
              {t("hero.heading")}
            </h1>
          </AnimateIn>

          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mb-16">
            {t("hero.lead")}
          </p>

          {/* Stats row — capability counts per group */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 pt-10 border-t border-border/50">
            {stats.map((s) => (
              <div key={s.key} className="flex flex-col gap-2">
                <span
                  className="text-2xl md:text-3xl font-semibold text-foreground"
                  style={{ letterSpacing: "var(--tracking-tight)" }}
                >
                  {s.count}
                </span>
                <span className="text-xs md:text-sm font-mono tracking-wider uppercase text-muted-foreground">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-10 text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground/70">
            {t("hero.totalLabel", { count: totalCount })}
          </p>
        </div>
      </section>

      {/* ─── Section 2 · Group breakdown (one section per group) ──────────── */}
      {CAPABILITY_GROUPS.map((group, groupIdx) => {
        const letter = String.fromCharCode(65 + groupIdx);
        const Icon = GROUP_ICONS[group.key] ?? Boxes;
        // Alternating bg for visual rhythm without introducing new tokens.
        const altBg = groupIdx % 2 === 1 ? "bg-muted/30" : "bg-background";
        // Tailwind grid — modality has 6 items (3-col), tech/platform have 4 (2x2 on md),
        // governance has 5; cap at 3 columns for readability.
        const gridCols =
          group.items.length >= 5
            ? "md:grid-cols-2 lg:grid-cols-3"
            : group.items.length === 4
              ? "md:grid-cols-2"
              : "md:grid-cols-2 lg:grid-cols-3";

        return (
          <section key={group.key} className={`py-24 md:py-32 ${altBg} border-b border-border/50`}>
            <div className="container mx-auto px-4 max-w-wide">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16 md:mb-20">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-3 mb-6 px-3 py-1.5 rounded-full border border-border bg-background">
                    <Icon className="h-4 w-4 text-foreground" aria-hidden="true" />
                    <span className="text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground">
                      {t("groupLabel", { letter })}
                      {" · "}
                      {t("groupItemsLabel", { count: group.items.length })}
                    </span>
                  </div>

                  <AnimateIn preset="fadeUp">
                    <h2
                      className="text-3xl md:text-4xl lg:text-5xl font-semibold text-balance mb-4"
                      style={{
                        letterSpacing: "var(--tracking-heading)",
                        lineHeight: "var(--leading-heading)",
                      }}
                    >
                      {letter} · {t(`groups.${group.key}.title`)}
                    </h2>
                  </AnimateIn>

                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                    {t(`groups.${group.key}.subtitle`)}
                  </p>
                </div>

                <div className="hidden lg:flex items-end text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground/60">
                  {String(groupIdx + 1).padStart(2, "0")} /{" "}
                  {String(CAPABILITY_GROUPS.length).padStart(2, "0")}
                </div>
              </div>

              <div className={`grid grid-cols-1 ${gridCols} gap-5 md:gap-6`}>
                {group.items.map((item, idx) => {
                  const cap = {
                    category: t(`capabilities.${item}.category`),
                    description: t(`capabilities.${item}.description`),
                  };
                  return (
                    <article
                      key={item}
                      className="group relative h-full flex flex-col gap-4 p-7 md:p-8 rounded-[var(--radius-2xl)] border border-border bg-background hover:border-foreground/40 hover:shadow-lg transition-[border-color,box-shadow] duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground/70">
                          {letter}.{String(idx + 1).padStart(2, "0")}
                        </span>
                        <Icon
                          className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors"
                          aria-hidden="true"
                        />
                      </div>

                      <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-snug">
                        {cap.category}
                      </h3>

                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed mt-auto">
                        {cap.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {/* ─── Section 3 · Capability matrix overview ─────────────────────── */}
      <section className="py-24 md:py-32 bg-background border-b border-border/50">
        <div className="container mx-auto px-4 max-w-wide">
          <div className="mb-16 md:mb-20 max-w-3xl">
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-6 block">
              {t("matrix.kicker")}
            </span>
            <AnimateIn preset="fadeUp">
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-semibold text-balance mb-6"
                style={{
                  letterSpacing: "var(--tracking-heading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                {t("matrix.heading")}
              </h2>
            </AnimateIn>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {t("matrix.lead")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {CAPABILITY_GROUPS.map((group, groupIdx) => {
              const Icon = GROUP_ICONS[group.key] ?? Boxes;
              return (
                <div
                  key={group.key}
                  className="h-full flex flex-col gap-5 p-6 md:p-7 rounded-[var(--radius-2xl)] border border-border bg-muted/30"
                >
                  <div className="flex items-center gap-3 pb-5 border-b border-border/60">
                    <Icon className="h-5 w-5 text-foreground" aria-hidden="true" />
                    <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
                      {String.fromCharCode(65 + groupIdx)} · {group.items.length}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold tracking-tight text-foreground leading-snug">
                    {t(`groups.${group.key}.title`)}
                  </h3>
                  <ul className="flex flex-col gap-2.5 mt-1">
                    {group.items.map((item) => {
                      return (
                        <li
                          key={item}
                          className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed"
                        >
                          <span
                            className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-foreground/40"
                            aria-hidden="true"
                          />
                          <span>{t(`capabilities.${item}.category`)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Section 4 · CTA ─────────────────────────────────────────────── */}
      <section className="py-32 md:py-40 bg-background">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="inline-block mb-8 px-4 py-1.5 rounded-full border border-border bg-muted/30">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">
              {t("cta.kicker")}
            </span>
          </div>

          <AnimateIn preset="fadeUp">
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-semibold text-balance mb-8"
              style={{
                letterSpacing: "var(--tracking-heading)",
                lineHeight: "var(--leading-heading)",
              }}
            >
              {t("cta.heading")}
            </h2>
          </AnimateIn>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-12">
            {t("cta.lead")}
          </p>

          <Button asChild variant="ink" size="lg">
            <Link href="/contact">
              {t("cta.button")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
