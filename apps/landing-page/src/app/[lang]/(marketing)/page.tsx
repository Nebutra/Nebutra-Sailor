import { FAQ, PricingTable, SocialProofBar, Waitlist } from "@nebutra/marketing";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import dynamic from "next/dynamic";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FeatureCards, FooterMinimal, HeroSection, LogoStrip, Navbar } from "@/components/landing";
import { type Locale, routing } from "@/i18n/routing";

const ProductDemoSection = dynamic(
  () => import("@/components/landing").then((mod) => mod.ProductDemoSection),
  {
    loading: () => <section className="h-72" aria-hidden />,
  },
);

const WorkflowSection = dynamic(
  () => import("@/components/landing").then((mod) => mod.WorkflowSection),
  {
    loading: () => <section className="h-64" aria-hidden />,
  },
);

const TestimonialsSection = dynamic(
  () => import("@/components/landing").then((mod) => mod.TestimonialsSection),
  {
    loading: () => <section className="h-72" aria-hidden />,
  },
);

const PricingHintSection = dynamic(
  () => import("@/components/landing").then((mod) => mod.PricingHintSection),
  {
    loading: () => <section className="h-64" aria-hidden />,
  },
);

const FinalCTA = dynamic(() => import("@/components/landing").then((mod) => mod.FinalCTA), {
  loading: () => <section className="h-72" aria-hidden />,
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};

  const t = await getTranslations({ locale: lang, namespace: "metadata" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${lang}`,
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export default async function LocalizedHomePage({ params }: { params: Promise<{ lang: string }> }) {
  "use cache";
  cacheLife("hours");

  const { lang } = await params;
  const locale = lang as Locale;
  setRequestLocale(locale);

  const tMarketing = await getTranslations({ locale, namespace: "marketing" });

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-black">
      <Navbar />
      <HeroSection />
      <LogoStrip locale={locale} />
      <ProductDemoSection />
      <FeatureCards />
      <WorkflowSection />
      <TestimonialsSection />

      {/* Shipfast Conversion Kit Injection */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-24">
            <SocialProofBar
              stats={{ users: 1024, rating: 4.9, productHuntUpvotes: 890 }}
              variant="badges"
              className="justify-center"
            />
          </div>

          <PricingTable
            title={tMarketing("pricingHeader.title")}
            description={tMarketing("pricingHeader.description")}
            mostPopularText={tMarketing("pricingHeader.mostPopular")}
            perMonthText={tMarketing("pricingHeader.perMonth")}
            plans={[
              {
                name: tMarketing("pricing.hobby.name"),
                price: tMarketing("pricing.hobby.price"),
                description: tMarketing("pricing.hobby.description"),
                features: tMarketing.raw("pricing.hobby.features") as string[],
                ctaText: tMarketing("pricing.hobby.ctaText"),
                ctaUrl: "/signup",
              },
              {
                name: tMarketing("pricing.pro.name"),
                price: tMarketing("pricing.pro.price"),
                description: tMarketing("pricing.pro.description"),
                isPopular: true,
                features: tMarketing.raw("pricing.pro.features") as string[],
                ctaText: tMarketing("pricing.pro.ctaText"),
                ctaUrl: "/signup",
              },
              {
                name: tMarketing("pricing.enterprise.name"),
                price: tMarketing("pricing.enterprise.price"),
                description: tMarketing("pricing.enterprise.description"),
                features: tMarketing.raw("pricing.enterprise.features") as string[],
                ctaText: tMarketing("pricing.enterprise.ctaText"),
                ctaUrl: "/contact",
              },
            ]}
          />

          <div className="mt-32">
            <FAQ
              title={tMarketing("faqHeader.title")}
              description={tMarketing("faqHeader.description")}
              items={[
                {
                  question: tMarketing("faq.q1.q"),
                  answer: tMarketing("faq.q1.a"),
                },
                {
                  question: tMarketing("faq.q2.q"),
                  answer: tMarketing("faq.q2.a"),
                },
                {
                  question: tMarketing("faq.q3.q"),
                  answer: tMarketing("faq.q3.a"),
                },
              ]}
            />
          </div>

          <div className="mt-32 mb-12">
            <Waitlist
              title={tMarketing("waitlist.title")}
              description={tMarketing("waitlist.description")}
              placeholder={tMarketing("waitlist.placeholder")}
              buttonText={tMarketing("waitlist.buttonText")}
              loadingText={tMarketing("waitlist.loadingText")}
              successText={tMarketing("waitlist.successText")}
              successMessage={tMarketing("waitlist.successMessage")}
              socialProofPrefix={tMarketing("waitlist.socialProofPrefix")}
              socialProofSuffix={tMarketing("waitlist.socialProofSuffix")}
              socialProofCount={2381}
            />
          </div>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
