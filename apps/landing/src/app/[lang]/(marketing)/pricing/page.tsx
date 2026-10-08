import { brand } from "@nebutra/brand/metadata";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FinalCTA, PricingSection, ProductPlansSection } from "@/components/landing";
import { PricingComparisonTable } from "@/components/landing/pricing-comparison-table";
import { StructuredData } from "@/components/seo/structured-data";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { canonicalUrlForLocale, getSiteUrl } from "@/lib/seo/site-routes";
import { buildFaqPageSchema, buildProductSchema } from "@/lib/seo/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};

  const t = await getTranslations({ locale: lang as Locale, namespace: "metadata" });
  const tp = await getTranslations({ locale: lang as Locale, namespace: "microLanding.pricing" });
  return buildPageMetadata({
    title: `${tp("title")} — ${t("title")}`,
    description: tp("description"),
    path: "/pricing",
    locale: lang as Locale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export default async function PricingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const pricing = await getTranslations({
    locale: lang as Locale,
    namespace: "microLanding.pricing",
  });

  const faq = await getTranslations({ locale: lang as Locale, namespace: "microLanding.faq" });
  type FaqTranslationKey = Parameters<typeof faq>[0];

  // The canonical URL (no /en prefix for the default locale), not /${lang}/pricing.
  const pageUrl = canonicalUrlForLocale(getSiteUrl(), lang, "/pricing");
  const faqKeys = ["q1", "q2", "q3"] as const;

  const productLd = buildProductSchema({
    name: `${brand.name} Sailor`,
    description: pricing("description"),
    url: pageUrl,
    brand: brand.name,
    offers: {
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: pageUrl,
    },
  });

  // The FAQ below, as data: answer engines quote FAQPage entries directly.
  const faqLd = buildFaqPageSchema(
    faqKeys.map((qKey) => ({
      question: faq(`${qKey}.q` as FaqTranslationKey),
      answer: faq(`${qKey}.a` as FaqTranslationKey),
    })),
  );

  return (
    <main id="main-content" className="flex-1 bg-background">
      <StructuredData data={productLd} id="pricing-product-jsonld" />
      <StructuredData data={faqLd} id="pricing-faq-jsonld" />

      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimateIn preset="emerge" inView>
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {pricing("title")}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{pricing("description")}</p>

            {/* The licence line — what is true of every tier, not a rating. */}
            <p className="mt-6 text-sm text-muted-foreground">
              {pricing.rich("socialProofText", {
                highlight: (chunks) => (
                  <span className="font-medium text-foreground">{chunks}</span>
                ),
              })}
            </p>
          </div>
        </AnimateIn>

        {/* Pricing cards — 3 tier grid */}
        <div className="mt-16">
          <PricingSection hideHeader />
        </div>

        {/* Comparison Table — license tier breakdown */}
        <PricingComparisonTable />

        <ProductPlansSection />

        {/* FAQ section */}
        <div className="mt-24">
          <AnimateIn preset="emerge" inView>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground">{faq("title")}</h2>
              <p className="mt-3 text-muted-foreground">{faq("description")}</p>
            </div>
          </AnimateIn>

          <AnimateInGroup
            stagger="normal"
            className="mx-auto mt-12 max-w-3xl divide-y divide-border"
          >
            {faqKeys.map((qKey) => (
              <AnimateIn key={qKey} preset="fadeUp">
                <details className="group py-6">
                  <summary className="flex cursor-pointer items-center justify-between text-left font-medium text-foreground">
                    {faq(`${qKey}.q` as FaqTranslationKey)}
                    <span className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {faq(`${qKey}.a` as FaqTranslationKey)}
                  </p>
                </details>
              </AnimateIn>
            ))}
          </AnimateInGroup>
        </div>

        {/* Contact nudge */}
        <AnimateIn preset="fade" inView>
          <p className="mt-16 text-center text-sm text-muted-foreground">
            <Link
              href="/contact"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {faq("contactNudge")}
            </Link>
          </p>
        </AnimateIn>
      </section>

      <FinalCTA />
    </main>
  );
}
