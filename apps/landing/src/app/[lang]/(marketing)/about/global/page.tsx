import { ArrowRight } from "@nebutra/icons";
import { AuroraBackground, Button } from "@nebutra/ui/primitives";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnimateIn, AnimateInGroup } from "@/components/landing/AnimateIn";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

// ─── Page-local data (copy lives in aboutPages.global.*) ─────────────────────

/** The four readiness pillars — `points.<key>.title|desc`. */
const POINTS = [
  { key: "languages", icon: "🌍" },
  { key: "compliance", icon: "📜" },
  { key: "payments", icon: "💳" },
  { key: "edge", icon: "⚡" },
] as const;

/** `languages.items.<code>.name|region`. */
const LANGUAGES = [
  { code: "ZH", flag: "🇨🇳" },
  { code: "EN", flag: "🇺🇸" },
  { code: "JA", flag: "🇯🇵" },
  { code: "KO", flag: "🇰🇷" },
  { code: "ES", flag: "🇪🇸" },
  { code: "FR", flag: "🇫🇷" },
  { code: "DE", flag: "🇩🇪" },
] as const;

type ComplianceStatus = "day1" | "roadmap";

/** `compliance.rows.<key>.region|framework`; the badge is `compliance.status.<status>`. */
const COMPLIANCE_ROWS = [
  { key: "pipl", status: "day1" },
  { key: "gdpr", status: "day1" },
  { key: "ccpa", status: "day1" },
  { key: "dataExport", status: "day1" },
  { key: "soc2", status: "roadmap" },
] as const satisfies ReadonlyArray<{ key: string; status: ComplianceStatus }>;

/** Gateway names are brands; the region is `payments.regions.<region>`. */
const PAYMENT_GATEWAYS = [
  { name: "Creem", region: "global" },
  { name: "WeChat Pay", region: "mainlandChina" },
  { name: "Alipay", region: "mainlandChina" },
] as const;

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);
  const t = await getTranslations({ locale: lang, namespace: "aboutPages.global" });

  return buildPageMetadata({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/about/global",
    locale: lang as Locale,
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function GlobalPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);
  const t = await getTranslations({ locale: lang, namespace: "aboutPages.global" });

  return (
    <main id="main-content" className="flex flex-col flex-1 bg-background">
      {/* 1. Hero — Day 1 Global */}
      <section className="relative pt-32 md:pt-48 pb-24 md:pb-32 overflow-hidden">
        <AuroraBackground variant="subtle" />
        <div className="container mx-auto px-4 max-w-wide">
          <AnimateIn preset="emerge" className="max-w-4xl mx-auto text-center">
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-8 block">
              {t("hero.eyebrow")}
            </span>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-balance mb-10"
              style={{
                letterSpacing: "var(--tracking-display)",
                lineHeight: "var(--leading-display)",
              }}
            >
              {t("hero.title")}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed text-balance">
              {t("hero.lead")}
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* 2. Four Pillars of Global Readiness */}
      <section className="py-24 md:py-32 border-t border-border/50">
        <div className="container mx-auto px-4 max-w-wide">
          <AnimateIn preset="fadeUp" className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6"
              style={{
                letterSpacing: "var(--tracking-heading)",
                lineHeight: "var(--leading-heading)",
              }}
            >
              {t("pillars.title")}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {t("pillars.lead")}
            </p>
          </AnimateIn>

          <AnimateInGroup
            stagger="normal"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {POINTS.map((point) => {
              const p = {
                icon: point.icon,
                title: t(`points.${point.key}.title`),
                desc: t(`points.${point.key}.desc`),
              };
              return (
                <AnimateIn key={point.key} preset="fadeUp">
                  <div
                    className="group h-full bg-muted/20 rounded-[var(--radius-card)] p-8 transition-[background-color,border-color,box-shadow,transform] duration-500 flex flex-col"
                    style={{ boxShadow: "var(--ring-hairline)" }}
                  >
                    <div className="text-6xl mb-8" aria-hidden="true">
                      {p.icon}
                    </div>
                    <h3 className="text-xl font-bold tracking-tight mb-3 text-foreground group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  </div>
                </AnimateIn>
              );
            })}
          </AnimateInGroup>
        </div>
      </section>

      {/* 3. Language Coverage Matrix */}
      <section className="py-24 md:py-32 bg-muted/30 border-t border-border/50">
        <div className="container mx-auto px-4 max-w-wide">
          <AnimateIn preset="fadeUp" className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-6 block">
              i18n · l10n
            </span>
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6"
              style={{
                letterSpacing: "var(--tracking-heading)",
                lineHeight: "var(--leading-heading)",
              }}
            >
              {t("languages.title")}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {t("languages.lead")}
            </p>
          </AnimateIn>

          <AnimateInGroup
            stagger="fast"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {LANGUAGES.map((lng) => (
              <AnimateIn key={lng.code} preset="fadeUp">
                <div className="group h-full bg-background border border-border/50 rounded-[var(--radius-2xl)] p-6 hover:border-border transition-[border-color] duration-flow ease-out flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl" aria-hidden="true">
                      {lng.flag}
                    </span>
                    <span className="text-[11px] font-mono font-bold tracking-widest text-muted-foreground px-2 py-1 rounded-[var(--radius-md)] bg-muted/50 border border-border/50">
                      {lng.code}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold tracking-tight mb-1 text-foreground">
                    {t(`languages.items.${lng.code}.name`)}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t(`languages.items.${lng.code}.region`)}
                  </p>
                </div>
              </AnimateIn>
            ))}
          </AnimateInGroup>
        </div>
      </section>

      {/* 4. Compliance Matrix */}
      <section className="py-24 md:py-32 border-t border-border/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <AnimateIn preset="fadeUp" className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-6 block">
              {t("compliance.eyebrow")}
            </span>
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6"
              style={{
                letterSpacing: "var(--tracking-heading)",
                lineHeight: "var(--leading-heading)",
              }}
            >
              {t("compliance.title")}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {t("compliance.lead")}
            </p>
          </AnimateIn>

          <AnimateIn preset="fadeUp">
            <div className="overflow-hidden rounded-[var(--radius-card)] border border-border/50 bg-background">
              {/* Header row — hidden on mobile */}
              <div className="hidden md:grid md:grid-cols-[1.2fr_1.5fr_1fr] gap-6 px-8 py-5 bg-muted/40 border-b border-border/50">
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                  {t("compliance.columns.region")}
                </span>
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                  {t("compliance.columns.framework")}
                </span>
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground text-right">
                  {t("compliance.columns.status")}
                </span>
              </div>

              {COMPLIANCE_ROWS.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-1 md:grid-cols-[1.2fr_1.5fr_1fr] gap-2 md:gap-6 px-6 md:px-8 py-6 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex flex-col md:block">
                    <span className="md:hidden text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">
                      {t("compliance.columns.region")}
                    </span>
                    <span className="text-base font-semibold text-foreground">
                      {t(`compliance.rows.${row.key}.region`)}
                    </span>
                  </div>
                  <div className="flex flex-col md:block">
                    <span className="md:hidden text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">
                      {t("compliance.columns.framework")}
                    </span>
                    <span className="text-base text-muted-foreground font-mono">
                      {t(`compliance.rows.${row.key}.framework`)}
                    </span>
                  </div>
                  <div className="flex md:justify-end items-center">
                    <span
                      className={
                        row.status === "day1"
                          ? "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-foreground text-background"
                          : "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border"
                      }
                    >
                      <span
                        className={
                          row.status === "day1"
                            ? "w-1.5 h-1.5 rounded-full bg-background"
                            : "w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        }
                        aria-hidden="true"
                      />
                      {t(`compliance.status.${row.status}`)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* 5. Multi-region Payments */}
      <section className="py-24 md:py-32 bg-muted/30 border-t border-border/50">
        <div className="container mx-auto px-4 max-w-wide">
          <AnimateIn preset="fadeUp" className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-6 block">
              {t("payments.eyebrow")}
            </span>
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6"
              style={{
                letterSpacing: "var(--tracking-heading)",
                lineHeight: "var(--leading-heading)",
              }}
            >
              {t("payments.title")}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {t("payments.lead")}
            </p>
          </AnimateIn>

          <AnimateInGroup stagger="fast" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PAYMENT_GATEWAYS.map((gw) => (
              <AnimateIn key={gw.name} preset="fadeUp">
                <div className="group h-full bg-background border border-border/50 rounded-[var(--radius-2xl)] p-6 hover:border-foreground/30 transition-[border-color] duration-flow ease-out flex flex-col items-center text-center">
                  <span
                    className="text-lg md:text-xl font-semibold text-foreground mb-2"
                    style={{ letterSpacing: "var(--tracking-tight)" }}
                  >
                    {gw.name}
                  </span>
                  <span className="text-[11px] font-mono tracking-wider uppercase text-muted-foreground">
                    {t(`payments.regions.${gw.region}`)}
                  </span>
                </div>
              </AnimateIn>
            ))}
          </AnimateInGroup>
        </div>
      </section>

      {/* 6. CTA */}
      <section className="py-32 md:py-48 bg-background border-t border-border/50">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <AnimateIn preset="emerge">
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-sm font-bold tracking-widest uppercase text-primary">
                {t("cta.eyebrow")}
              </span>
            </div>
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-semibold text-balance mb-8"
              style={{
                letterSpacing: "var(--tracking-heading)",
                lineHeight: "var(--leading-heading)",
              }}
            >
              {t("cta.title")}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed text-balance mb-12 max-w-2xl mx-auto">
              {t("cta.lead")}
            </p>
            <Button asChild variant="ink" size="lg">
              <Link href="/contact">
                {t("cta.button")} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </AnimateIn>
        </div>
      </section>
    </main>
  );
}
