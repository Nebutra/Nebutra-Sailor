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
            plans={[
              {
                name: "Hobby",
                price: "Free",
                description: "For side projects",
                features: ["1 Project", "Community Support", "Basic Analytics"],
                ctaText: "Start Free",
                ctaUrl: "/signup",
              },
              {
                name: "Pro",
                price: "$29",
                description: "For startups",
                isPopular: true,
                features: [
                  "Unlimited Projects",
                  "Priority Support",
                  "Custom Domain",
                  "Advanced AI",
                ],
                ctaText: "Get Pro",
                ctaUrl: "/signup",
              },
              {
                name: "Enterprise",
                price: "Custom",
                description: "For large teams",
                features: ["SSO", "Dedicated Slack Channel", "SLA 99.9%", "White-label"],
                ctaText: "Contact Us",
                ctaUrl: "/contact",
              },
            ]}
          />

          <div className="mt-32">
            <FAQ
              items={[
                {
                  question: "Is this a subscription?",
                  answer:
                    "Yes, our Pro plan is billed monthly. You can cancel at any time with no hidden fees.",
                },
                {
                  question: "Do you offer refunds?",
                  answer: "We offer a 14-day no-questions-asked money-back guarantee.",
                },
                {
                  question: "Can I use this for client work?",
                  answer: "Absolutely. The commercial license covers unlimited client projects.",
                },
              ]}
            />
          </div>

          <div className="mt-32 mb-12">
            <Waitlist socialProofCount={2381} />
          </div>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
