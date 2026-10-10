import { brand } from "@nebutra/brand/metadata";
import { logger } from "@nebutra/logger";
import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { PricingComparisonTable } from "@/components/landing/pricing-comparison-table";
import { ProductOfferList } from "@/components/landing/product-offer-list";
import { StructuredData } from "@/components/seo/structured-data";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import { listedOffers } from "@/lib/pricing-listing";
import { loadPublicOffers } from "@/lib/public-offers";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { canonicalUrlForLocale, getSiteUrl } from "@/lib/seo/site-routes";
import { buildFaqPageSchema, buildProductSchema } from "@/lib/seo/structured-data";
import { PRODUCTS } from "@/nebutra/data/products";
import { Band } from "@/nebutra/ui/page";
import { SailorTiers } from "./sailor-tiers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};

  const t = await getTranslations({ locale: lang as Locale, namespace: "metadata" });
  const tp = await getTranslations({ locale: lang as Locale, namespace: "productPricing" });
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

const GLYPHS: Record<string, string> = {
  router: "/images/product/router-glyph.svg",
  kcq: "/images/product/kcq-glyph.svg",
};

/** Real captures of the live products (see public/images/product). */
const VISUALS: Record<
  string,
  {
    name: string;
    altKey: "altRouter" | "altKcq";
    width: number;
    height: number;
    /** Phone-width crop, `<name>-m.avif|webp`. */
    mobile: { width: number; height: number };
  }
> = {
  router: {
    name: "router-shelf",
    altKey: "altRouter",
    width: 1600,
    height: 1000,
    mobile: { width: 640, height: 720 },
  },
  kcq: {
    name: "kcq-workbench",
    altKey: "altKcq",
    width: 1600,
    height: 1000,
    mobile: { width: 640, height: 720 },
  },
};

async function PaidProductPricing({ lang }: { lang: string }) {
  const t = await getTranslations({ locale: lang, namespace: "productPricing" });
  const zh = lang.startsWith("zh");
  const PRICING_PRODUCTS = PRODUCTS.map((p) => {
    const v = VISUALS[p.id];
    return {
      id: p.id,
      name: p.name,
      href: p.href,
      what: zh ? p.whatZh : p.what,
      domain: p.domain,
      glyph: GLYPHS[p.id],
      visual: v
        ? {
            name: v.name,
            alt: t(v.altKey),
            width: v.width,
            height: v.height,
            mobile: v.mobile,
          }
        : undefined,
    };
  });
  try {
    // Only products the site knows by name are listed; an unnamed one would print a bare id.
    const known = new Set(PRICING_PRODUCTS.map((p) => p.id));
    const offers = listedOffers(await loadPublicOffers(env.NEXT_PUBLIC_API_URL)).filter((o) =>
      known.has(o.product),
    );
    if (offers.length === 0) return <p className="mt-8 text-muted-foreground">{t("empty")}</p>;
    return <ProductOfferList offers={offers} products={PRICING_PRODUCTS} locale={lang} t={t} />;
  } catch (error) {
    unstable_rethrow(error);
    logger.error("Public pricing catalog unavailable", error);
    return <p className="mt-8 text-muted-foreground">{t("unavailable")}</p>;
  }
}

const eyebrow = "text-xs uppercase tracking-wider text-muted-foreground";
const SAILOR_FAQ = ["q1", "q2", "q3"] as const;
const PRODUCT_FAQ = ["f1", "f2", "f3", "f5"] as const;

export default async function PricingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const paid = await getTranslations({ locale: lang, namespace: "productPricing" });
  const pricing = await getTranslations({
    locale: lang as Locale,
    namespace: "microLanding.pricing",
  });
  const faq = await getTranslations({ locale: lang as Locale, namespace: "microLanding.faq" });
  type FaqTranslationKey = Parameters<typeof faq>[0];
  type PaidKey = Parameters<typeof paid>[0];

  // The canonical URL (no /en prefix for the default locale), not /${lang}/pricing.
  const pageUrl = canonicalUrlForLocale(getSiteUrl(), lang, "/pricing");
  const billingEmail = `tseka@${brand.domains.landing}`;

  const questions = [
    ...PRODUCT_FAQ.map((k) => ({
      q: paid(`faq.${k}.q` as PaidKey),
      a: paid(`faq.${k}.a` as PaidKey),
    })),
    ...SAILOR_FAQ.map((k) => ({
      q: faq(`${k}.q` as FaqTranslationKey),
      a: faq(`${k}.a` as FaqTranslationKey),
    })),
  ];

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
  const faqLd = buildFaqPageSchema(questions.map(({ q, a }) => ({ question: q, answer: a })));

  const trust = ["trustCards", "trustCn", "trustCurrency", "trustOneTime"] as const;
  const billing = [
    ["billCardsTitle", "billCardsBody"],
    ["billCnTitle", "billCnBody"],
    ["billTaxTitle", "billTaxBody"],
    ["billWalletTitle", "billWalletBody"],
  ] as const;

  return (
    <main id="main-content" className="flex-1 bg-background">
      <StructuredData data={productLd} id="pricing-product-jsonld" />
      <StructuredData data={faqLd} id="pricing-faq-jsonld" />

      <section className="px-8 pt-28 pb-14 xl:px-16">
        <div className="mx-auto max-w-wide">
          <p className={eyebrow}>{paid("eyebrow")}</p>
          <h1 className="mt-5 max-w-4xl font-heading text-5xl tracking-tight text-foreground text-balance sm:text-6xl lg:text-7xl">
            {paid.rich("heroTitle", {
              signature: (chunks) => <span className="signature">{chunks}</span>,
            })}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{paid("description")}</p>
          <ul className="mt-10 flex flex-wrap gap-2">
            {trust.map((k) => (
              <li
                key={k}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground"
              >
                {paid(k)}
              </li>
            ))}
          </ul>
          <nav
            aria-label={paid("eyebrow")}
            className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"
          >
            {["router", "kcq"].map((id) => (
              <a key={id} href={`#pricing-${id}`} className="hover:text-foreground">
                {PRODUCTS.find((p) => p.id === id)?.name}
              </a>
            ))}
            <a href="#sailor-licences" className="hover:text-foreground">
              {paid("jumpSailor")}
            </a>
            <a href="#faq" className="hover:text-foreground">
              {paid("jumpFaq")}
            </a>
          </nav>
        </div>
      </section>

      <section
        id="product-pricing"
        aria-label={paid("title", { brandName: brand.name })}
        className="scroll-mt-20 px-8 pb-24 xl:px-16"
      >
        <div className="mx-auto max-w-wide">
          <Suspense fallback={<p className="mt-8 text-muted-foreground">{paid("loading")}</p>}>
            <PaidProductPricing lang={lang} />
          </Suspense>
        </div>
      </section>

      <Band id="billing">
        <div className="mx-auto max-w-wide">
          <h2 className="font-heading text-3xl tracking-tight text-foreground">
            {paid("billingTitle")}
          </h2>
          <dl className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {billing.map(([title, body]) => (
              <div key={title} className="bg-card p-6">
                <dt className="text-sm font-medium text-foreground">{paid(title)}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{paid(body)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/refund" className="text-foreground hover:underline">
              {paid("refund")}
            </Link>
            <Link href="/terms" className="text-foreground hover:underline">
              {paid("terms")}
            </Link>
            <Link href="/privacy" className="text-foreground hover:underline">
              {paid("privacy")}
            </Link>
            <a href={`mailto:${billingEmail}`} className="text-foreground hover:underline">
              {paid("billingEmail")}: {billingEmail}
            </a>
          </p>
        </div>
      </Band>

      <Band id="sailor-licences" className="scroll-mt-20">
        <div className="mx-auto max-w-wide">
          <p className={eyebrow}>Sailor</p>
          <h2 className="mt-4 max-w-3xl font-heading text-4xl tracking-tight text-foreground text-balance">
            {pricing("title")}
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            {pricing("description", { brandName: brand.name })}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {pricing.rich("socialProofText", {
              highlight: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            })}
          </p>
          <SailorTiers lang={lang} />
          <PricingComparisonTable />
        </div>
      </Band>

      <Band id="faq" className="scroll-mt-20">
        <div className="mx-auto grid max-w-wide gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <h2 className="font-heading text-3xl tracking-tight text-foreground">
              {paid("faqTitle")}
            </h2>
            <p className="mt-3 text-muted-foreground">{paid("faqLead")}</p>
            <Link
              href="/contact"
              className="mt-6 inline-flex text-sm font-medium text-foreground hover:underline"
            >
              {faq("contactNudge", { brandName: brand.name })}
            </Link>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {questions.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  {q}
                  <span
                    aria-hidden
                    className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </Band>
    </main>
  );
}
