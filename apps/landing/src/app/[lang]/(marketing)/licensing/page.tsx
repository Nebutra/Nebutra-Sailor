import { CheckCircle, LogoGithub as Github } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { AuroraBackground, Badge, Button, Card } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import { type Locale, routing } from "@/i18n/routing";
import { getExchangeRate } from "@/lib/pricing/exchange-rates";
import { buildPageMetadata } from "@/lib/seo/metadata";

/** Team support subscription, USD/year. Mirrors LICENSE-COMMERCIAL.md §2. */
const COMMERCIAL_BASE_PRICE_USD = 2000;

/**
 * Async child component that resolves geo-aware pricing.
 *
 * Wrapped in <Suspense> at the call site so Next 16 Cache Components (PPR)
 * can statically render the marketing shell and stream in the localized
 * price when the request arrives. Avoids "Uncached data accessed outside
 * of <Suspense>" prerender errors while preserving user-facing value.
 */
type PriceBadgeVariant = "primary" | "muted";

const PRICE_BADGE_CLASS: Record<PriceBadgeVariant, string> = {
  primary: "mb-6 w-fit bg-primary text-primary-foreground border-none",
  muted: "mb-6 w-fit bg-muted text-muted-foreground border-border",
};

async function CommercialPriceBadge({
  lang,
  label,
  variant = "muted",
}: {
  lang: Locale;
  label: (price: string) => string;
  variant?: PriceBadgeVariant;
}) {
  const headersList = await headers();
  const userCurrency = headersList.get("x-user-currency") ?? "USD";
  const exchangeRate = await getExchangeRate(userCurrency);
  const commercialPrice = new Intl.NumberFormat(lang, {
    style: "currency",
    currency: userCurrency,
    maximumFractionDigits: 0,
  }).format(COMMERCIAL_BASE_PRICE_USD * exchangeRate);

  return (
    <Badge
      className={PRICE_BADGE_CLASS[variant]}
      variant={variant === "primary" ? "default" : "outline"}
    >
      {label(commercialPrice)}
    </Badge>
  );
}

function CommercialPriceBadgeFallback({
  lang,
  label,
  variant = "muted",
}: {
  lang: Locale;
  label: (price: string) => string;
  variant?: PriceBadgeVariant;
}) {
  const fallbackPrice = new Intl.NumberFormat(lang, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(COMMERCIAL_BASE_PRICE_USD);
  return (
    <Badge
      className={PRICE_BADGE_CLASS[variant]}
      variant={variant === "primary" ? "default" : "outline"}
    >
      {label(fallbackPrice)}
    </Badge>
  );
}

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
  const t = await getTranslations({ locale: lang as Locale, namespace: "licensing.meta" });
  return buildPageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/licensing",
    locale: lang as Locale,
  });
}

export default async function LicensingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);
  const t = await getTranslations({ locale: lang as Locale, namespace: "licensing" });

  // Geo-aware pricing is resolved in <CommercialPriceBadge> (async server
  // component wrapped in <Suspense>). The marketing shell renders statically;
  // localized price streams in on request. Next 16 Cache Components pattern.
  const commercialBadgeLabel = (price: string) => t("plans.team.badge", { price });

  const faqItems = [
    { q: t("faq.items.whyFsl.q"), a: t("faq.items.whyFsl.a") },
    { q: t("faq.items.reallyFree.q"), a: t("faq.items.reallyFree.a") },
    { q: t("faq.items.competingUse.q"), a: t("faq.items.competingUse.a") },
    { q: t("faq.items.upgrade.q"), a: t("faq.items.upgrade.a") },
    { q: t("faq.items.contributions.q"), a: t("faq.items.contributions.a") },
  ];

  return (
    <main
      id="main-content"
      className="min-h-screen bg-background selection:bg-primary/30 relative overflow-hidden"
    >
      <Navbar />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-4xl px-4 pt-32 pb-20 text-center sm:px-6 lg:px-8 mt-16">
        <AuroraBackground variant="subtle" />

        <AnimateIn preset="emerge" inView>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold mb-8"
            style={{
              letterSpacing: "var(--tracking-display)",
              lineHeight: "var(--leading-display)",
            }}
          >
            {t.rich("hero.title", {
              hl: (chunks) => (
                <span
                  className="text-transparent bg-clip-text"
                  style={{
                    background: "hsl(var(--primary))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {chunks}
                </span>
              ),
            })}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed font-medium">
            {t("hero.description")}
          </p>
        </AnimateIn>
      </section>

      {/* License Comparison Cards */}
      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-24 sm:px-6 lg:px-8">
        <AnimateInGroup
          stagger="normal"
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1200px] mx-auto"
        >
          {/* Card 1: Community (free) */}
          <AnimateIn preset="fadeUp" inView>
            <Card
              className="p-8 relative flex flex-col overflow-hidden rounded-[var(--radius-panel)] transition-[background-color,border-color,box-shadow] border-border bg-background/50 h-full"
              style={{ boxShadow: "var(--ring-hairline)" }}
            >
              <Badge
                className="mb-6 w-fit bg-muted text-muted-foreground border-border"
                variant="outline"
              >
                {t("plans.community.badge")}
              </Badge>

              <div className="mb-6">
                <h3
                  className="text-2xl font-semibold mb-2"
                  style={{ letterSpacing: "var(--tracking-tight)" }}
                >
                  {t("plans.community.title")}
                </h3>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("plans.community.subtitle")}
                </p>
              </div>

              <p className="text-muted-foreground text-sm mb-6 leading-relaxed min-h-[50px]">
                {t("plans.community.description")}
              </p>

              <div className="space-y-3 flex-grow mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.community.features.fullSource")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.community.features.closedSourceOk")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.community.features.noAttribution")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.community.features.communitySupport")}
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-bold rounded-[var(--radius-xl)]"
                variant="secondary"
                asChild
              >
                <a
                  href="https://github.com/nebutra-sailor"
                  className="flex items-center justify-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  {t("plans.community.cta")}
                </a>
              </Button>
            </Card>
          </AnimateIn>

          {/* Card 2: Free Commercial Exception (Highlighted) */}
          <AnimateIn preset="fadeUp" inView>
            <Card
              className="p-8 relative flex flex-col overflow-hidden rounded-[var(--radius-panel)] transition-[background-color,border-color,box-shadow] border-primary/50 bg-background/80 h-full"
              style={{ boxShadow: "var(--ring-hairline)" }}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

              <Suspense
                fallback={
                  <CommercialPriceBadgeFallback
                    lang={lang as Locale}
                    label={commercialBadgeLabel}
                    variant="primary"
                  />
                }
              >
                <CommercialPriceBadge
                  lang={lang as Locale}
                  label={commercialBadgeLabel}
                  variant="primary"
                />
              </Suspense>

              <div className="mb-6">
                <h3
                  className="text-2xl font-semibold mb-2"
                  style={{ letterSpacing: "var(--tracking-tight)" }}
                >
                  {t("plans.team.title")}
                </h3>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("plans.team.subtitle")}
                </p>
              </div>

              <p className="text-muted-foreground text-sm mb-6 leading-relaxed min-h-[50px]">
                {t("plans.team.description")}
              </p>

              <div className="space-y-3 flex-grow mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.team.features.privateChannel")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.team.features.firstResponse")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.team.features.priorityTriage")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.team.features.upgradeHelp")}
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-bold rounded-[var(--radius-xl)] shadow-lg shadow-primary/20"
                variant="default"
                asChild
              >
                <Link href="/get-license">{t("plans.team.cta")}</Link>
              </Button>
            </Card>
          </AnimateIn>

          {/* Card 3: Enterprise */}
          <AnimateIn preset="fadeUp" inView>
            <Card
              className="p-8 relative flex flex-col overflow-hidden rounded-[var(--radius-panel)] transition-[background-color,border-color,box-shadow] border-border bg-background/50 h-full"
              style={{ boxShadow: "var(--ring-hairline)" }}
            >
              <Badge
                className="mb-6 w-fit bg-muted text-muted-foreground border-border"
                variant="outline"
              >
                {t("plans.enterprise.badge")}
              </Badge>

              <div className="mb-6">
                <h3
                  className="text-2xl font-semibold mb-2"
                  style={{ letterSpacing: "var(--tracking-tight)" }}
                >
                  {t("plans.enterprise.title")}
                </h3>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("plans.enterprise.subtitle")}
                </p>
              </div>

              <p className="text-muted-foreground text-sm mb-6 leading-relaxed min-h-[50px]">
                {t("plans.enterprise.description")}
              </p>

              <div className="space-y-3 flex-grow mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">{t("plans.enterprise.features.sla")}</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.enterprise.features.indemnity")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.enterprise.features.compliance")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.enterprise.features.trademark")}
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-bold rounded-[var(--radius-xl)]"
                variant="secondary"
                asChild
              >
                <Link href="/get-license">{t("plans.enterprise.cta")}</Link>
              </Button>
            </Card>
          </AnimateIn>
        </AnimateInGroup>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 mx-auto max-w-4xl px-4 pb-32 sm:px-6 lg:px-8">
        <div className="border-t border-border pt-14">
          <AnimateIn preset="emerge" inView>
            <div className="mx-auto max-w-2xl text-center">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                FAQ
              </p>
              <h2
                className="text-3xl font-semibold md:text-4xl"
                style={{
                  letterSpacing: "var(--tracking-heading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                {t("faq.title")}
              </h2>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">{t("faq.description")}</p>
            </div>
          </AnimateIn>

          <div className="mt-12 divide-y divide-border rounded-[var(--radius-panel)] border border-border bg-card">
            {faqItems.map((item, idx) => (
              <article
                key={item.q}
                className="grid gap-4 px-5 py-6 sm:grid-cols-[2.5rem_1fr] sm:px-7 md:px-8"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted font-mono text-xs text-muted-foreground">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-card-foreground">{item.q}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{item.a}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
