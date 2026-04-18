import { CheckCircle, LogoGithub as Github } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Badge, Button, Card } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { type Locale, routing } from "@/i18n/routing";
import { getExchangeRate } from "@/lib/pricing/exchange-rates";

const COMMERCIAL_BASE_PRICE_USD = 799;

/**
 * Async child component that resolves geo-aware pricing.
 *
 * Wrapped in <Suspense> at the call site so Next 16 Cache Components (PPR)
 * can statically render the marketing shell and stream in the localized
 * price when the request arrives. Avoids "Uncached data accessed outside
 * of <Suspense>" prerender errors while preserving user-facing value.
 */
async function CommercialPriceBadge({
  lang,
  label,
}: {
  lang: Locale;
  label: (price: string) => string;
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
      className="mb-6 w-fit bg-muted text-muted-foreground border-border"
      variant="outline"
    >
      {label(commercialPrice)}
    </Badge>
  );
}

function CommercialPriceBadgeFallback({
  lang,
  label,
}: {
  lang: Locale;
  label: (price: string) => string;
}) {
  const fallbackPrice = new Intl.NumberFormat(lang, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(COMMERCIAL_BASE_PRICE_USD);
  return (
    <Badge
      className="mb-6 w-fit bg-muted text-muted-foreground border-border"
      variant="outline"
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
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: `/${lang}/licensing` },
  };
}

export default async function LicensingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);
  const t = await getTranslations({ locale: lang as Locale, namespace: "licensing" });

  // Geo-aware pricing is resolved in <CommercialPriceBadge> (async server
  // component wrapped in <Suspense>). The marketing shell renders statically;
  // localized price streams in on request. Next 16 Cache Components pattern.
  const commercialBadgeLabel = (price: string) =>
    t("plans.commercial.badge", { price });

  const faqItems = [
    { q: t("faq.items.whyAgpl.q"), a: t("faq.items.whyAgpl.a") },
    { q: t("faq.items.soloFree.q"), a: t("faq.items.soloFree.a") },
    { q: t("faq.items.opcDefinition.q"), a: t("faq.items.opcDefinition.a") },
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
      <section className="relative mx-auto max-w-5xl px-4 pt-32 pb-20 text-center sm:px-6 lg:px-8 mt-16">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

        <AnimateIn preset="emerge" inView>
          <h1 className="text-5xl font-black tracking-tighter sm:text-7xl mb-8 leading-[1.1]">
            {t.rich("hero.title", {
              hl: (chunks) => (
                <span
                  className="text-transparent bg-clip-text"
                  style={{
                    background: "var(--brand-gradient)",
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
          {/* Card 1: AGPL-3.0 */}
          <AnimateIn preset="fadeUp" inView>
            <Card className="p-8 relative flex flex-col overflow-hidden rounded-[2.5rem] transition-all hover:shadow-xl border-border/50 bg-background/50 backdrop-blur-md h-full">
              <Badge
                className="mb-6 w-fit bg-muted text-muted-foreground border-border"
                variant="outline"
              >
                {t("plans.agpl.badge")}
              </Badge>

              <div className="mb-6">
                <h3 className="text-2xl font-black tracking-tight mb-2">
                  {t("plans.agpl.title")}
                </h3>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("plans.agpl.subtitle")}
                </p>
              </div>

              <p className="text-muted-foreground text-sm mb-6 leading-relaxed min-h-[50px]">
                {t("plans.agpl.description")}
              </p>

              <div className="space-y-3 flex-grow mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.agpl.features.sourceAccess")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.agpl.features.mustOpenSource")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.agpl.features.mustCredit")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.agpl.features.communitySupport")}
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-bold rounded-xl"
                variant="secondary"
                asChild
              >
                <a
                  href="https://github.com/nebutra-sailor"
                  className="flex items-center justify-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  {t("plans.agpl.cta")}
                </a>
              </Button>
            </Card>
          </AnimateIn>

          {/* Card 2: Free Commercial Exception (Highlighted) */}
          <AnimateIn preset="fadeUp" inView>
            <Card className="p-8 relative flex flex-col overflow-hidden rounded-[2.5rem] transition-all hover:shadow-xl border-primary/50 bg-background/80 backdrop-blur-xl shadow-2xl shadow-primary/10 h-full">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

              <Badge
                className="mb-6 w-fit bg-primary text-primary-foreground border-none"
                variant="default"
              >
                {t("plans.freeCommercial.badge")}
              </Badge>

              <div className="mb-6">
                <h3 className="text-2xl font-black tracking-tight mb-2">
                  {t("plans.freeCommercial.title")}
                </h3>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("plans.freeCommercial.subtitle")}
                </p>
              </div>

              <p className="text-muted-foreground text-sm mb-6 leading-relaxed min-h-[50px]">
                {t("plans.freeCommercial.description")}
              </p>

              <div className="space-y-3 flex-grow mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.freeCommercial.features.closedSource")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.freeCommercial.features.teamSize")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.freeCommercial.features.creditRequired")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.freeCommercial.features.freeKey")}
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20"
                variant="default"
                asChild
              >
                <Link href="/get-license">{t("plans.freeCommercial.cta")}</Link>
              </Button>
            </Card>
          </AnimateIn>

          {/* Card 3: Startup / Enterprise */}
          <AnimateIn preset="fadeUp" inView>
            <Card className="p-8 relative flex flex-col overflow-hidden rounded-[2.5rem] transition-all hover:shadow-xl border-border/50 bg-background/50 backdrop-blur-md h-full">
              <Suspense
                fallback={
                  <CommercialPriceBadgeFallback
                    lang={lang as Locale}
                    label={commercialBadgeLabel}
                  />
                }
              >
                <CommercialPriceBadge lang={lang as Locale} label={commercialBadgeLabel} />
              </Suspense>

              <div className="mb-6">
                <h3 className="text-2xl font-black tracking-tight mb-2">
                  {t("plans.commercial.title")}
                </h3>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("plans.commercial.subtitle")}
                </p>
              </div>

              <p className="text-muted-foreground text-sm mb-6 leading-relaxed min-h-[50px]">
                {t("plans.commercial.description")}
              </p>

              <div className="space-y-3 flex-grow mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.commercial.features.closedSource")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.commercial.features.noCopyleft")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.commercial.features.noTeamLimits")}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t("plans.commercial.features.commercialSupport")}
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-bold rounded-xl"
                variant="secondary"
                asChild
              >
                <Link href="/get-license">{t("plans.commercial.cta")}</Link>
              </Button>
            </Card>
          </AnimateIn>
        </AnimateInGroup>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 mx-auto max-w-4xl px-4 pb-32 sm:px-6 lg:px-8">
        <AnimateIn preset="emerge" inView>
          <h2 className="text-4xl font-black tracking-tight mb-12 text-center">
            {t("faq.title")}
          </h2>
        </AnimateIn>

        <div className="space-y-8">
          <AnimateInGroup stagger="normal">
            {faqItems.map((item, idx) => (
              <AnimateIn key={idx} preset="fadeUp" inView>
                <div className="border border-border/50 rounded-2xl p-6 bg-background/50 backdrop-blur-md hover:border-primary/30 transition-colors">
                  <h3 className="text-lg font-bold mb-3">{item.q}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </AnimateIn>
            ))}
          </AnimateInGroup>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
