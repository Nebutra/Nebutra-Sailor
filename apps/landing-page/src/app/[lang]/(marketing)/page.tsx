import { ArrowRight } from "@nebutra/icons";
import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { HeroMockupWindow, LogoStrip, Navbar } from "@/components/landing";
import { HERO_BACKGROUND_VIDEOS } from "@/components/landing/HeroBackgroundVideo";
import { HeroSection } from "@/components/landing/HeroSection";

// Skeleton uses min-h so longer locales don't clip. Heights track real
// section sizes to keep CLS down while content streams in.
const SectionSkeleton = ({ minH = "32rem" }: { minH?: string }) => (
  <section aria-hidden className="w-full" style={{ minHeight: minH }} />
);

const ProductShowcase = dynamic(
  () => import("@/components/landing/ProductShowcase").then((m) => m.ProductShowcase),
  { loading: () => <SectionSkeleton minH="44rem" /> },
);

const ProductDemoSection = dynamic(
  () => import("@/components/landing/ProductDemoSection").then((m) => m.ProductDemoSection),
  { loading: () => <SectionSkeleton minH="48rem" /> },
);

const AIConstellationMarquee = dynamic(
  () => import("@/components/landing/AIConstellationMarquee").then((m) => m.AIConstellationMarquee),
  { loading: () => <SectionSkeleton minH="14rem" /> },
);

const CapabilityMatrixSection = dynamic(
  () =>
    import("@/components/landing/CapabilityMatrixSection").then((m) => m.CapabilityMatrixSection),
  { loading: () => <SectionSkeleton minH="56rem" /> },
);

const VelocityEngineSection = dynamic(
  () => import("@/components/landing/VelocityEngineSection").then((m) => m.VelocityEngineSection),
  { loading: () => <SectionSkeleton minH="36rem" /> },
);

const TestimonialsSection = dynamic(
  () => import("@/components/landing/TestimonialsSection").then((m) => m.TestimonialsSection),
  { loading: () => <SectionSkeleton minH="40rem" /> },
);

const AlternativeComparison = dynamic(
  () => import("@/components/landing/AlternativeComparison").then((m) => m.AlternativeComparison),
  { loading: () => <SectionSkeleton minH="44rem" /> },
);

const UseCasesSection = dynamic(
  () => import("@/components/landing/use-cases/UseCasesSection").then((m) => m.UseCasesSection),
  { loading: () => <SectionSkeleton minH="56rem" /> },
);

const AgenticEngineeringSection = dynamic(
  () =>
    import("@/components/landing/agentic-engineering/AgenticEngineeringSection").then(
      (m) => m.AgenticEngineeringSection,
    ),
  { loading: () => <SectionSkeleton minH="48rem" /> },
);

const HarnessEngineeringSection = dynamic(
  () =>
    import("@/components/landing/HarnessEngineeringSection").then(
      (m) => m.HarnessEngineeringSection,
    ),
  { loading: () => <SectionSkeleton minH="48rem" /> },
);

const DesignSystemSection = dynamic(
  () => import("@/components/landing/DesignSystemSection").then((m) => m.DesignSystemSection),
  { loading: () => <SectionSkeleton minH="48rem" /> },
);

const SEOGEOSection = dynamic(
  () => import("@/components/landing/seo-geo/SEOGEOSection").then((m) => m.SEOGEOSection),
  { loading: () => <SectionSkeleton minH="48rem" /> },
);

// SocialProofBar moved to /about page — see about/page.tsx

const LandingTestimonialsSection = dynamic(
  () => import("@/components/landing/testimonials-section").then((m) => m.TestimonialsSection),
  { loading: () => <SectionSkeleton minH="40rem" /> },
);

const PricingSection = dynamic(
  () => import("@/components/landing/PricingSection").then((m) => m.PricingSection),
  { loading: () => <SectionSkeleton minH="56rem" /> },
);

// PricingComparisonTable moved to /pricing page

const FAQSection = dynamic(
  () => import("@/components/landing/faq-section").then((m) => m.FAQSection),
  { loading: () => <SectionSkeleton minH="36rem" /> },
);

const FooterMinimal = dynamic(
  () => import("@/components/landing/FooterMinimal").then((m) => m.FooterMinimal),
  { loading: () => <SectionSkeleton minH="20rem" /> },
);

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
} from "@nebutra/ui/primitives";

import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function MarketingHomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "microLanding" });

  return (
    <Suspense>
      {/* React 19 hoists these to <head>. preconnect warms TLS to the CDN; the
          two media-scoped preload links let the browser fetch only the video
          variant that matches the user's color-scheme. */}
      <link rel="preconnect" href="https://d8j0ntlcm91z4.cloudfront.net" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://d8j0ntlcm91z4.cloudfront.net" />
      <link
        rel="preload"
        as="video"
        type="video/mp4"
        href={HERO_BACKGROUND_VIDEOS.light}
        media="(prefers-color-scheme: light)"
      />
      <link
        rel="preload"
        as="video"
        type="video/mp4"
        href={HERO_BACKGROUND_VIDEOS.dark}
        media="(prefers-color-scheme: dark)"
      />
      <main
        id="main-content"
        className="flex flex-col min-h-screen bg-background overflow-x-hidden"
      >
        <Navbar />
        <div className="hero-stage relative isolate overflow-hidden bg-background">
          {/* 1. Hero Section */}
          <HeroSection />

          {/* 2. Trust Badges / Quick Logo Bar */}
          <LogoStrip locale={lang as Locale} />

          {/* 2.5 Hero Mockup Window */}
          <section className="relative z-20 w-full overflow-visible bg-transparent pb-32 pt-2">
            <HeroMockupWindow />
          </section>
        </div>

        {/* 2.8 AI Constellation Marquee */}
        <AIConstellationMarquee />

        {/* 3. Product Showcase */}
        <ProductShowcase />

        {/* 4. Capability Matrix */}
        <CapabilityMatrixSection />
        <AgenticEngineeringSection />

        {/* 5. Product Demo + Velocity Engine */}
        <ProductDemoSection />
        <VelocityEngineSection />

        {/* 6. Harness Engineering */}
        <HarnessEngineeringSection />

        {/* 7. Testimonials */}
        <TestimonialsSection />

        {/* 7.8 Design System */}
        <DesignSystemSection />

        {/* 8. SEO & GEO — Discovery & Growth Engine */}
        <SEOGEOSection />

        <UseCasesSection />

        {/* Architecture section removed — content covered by CapabilityMatrix (RBAC, multi-tenant) */}

        {/* 8.5 Alternative Comparison — builds confidence before pricing */}
        <AlternativeComparison />

        {/* 4. High-Contrast Pricing Investment Section */}
        <PricingSection />

        {/* 4.5 Pricing Comparison Table — moved to /pricing */}

        {/* 4.7 Social Proof Bar — moved to /about */}

        {/* 4.8 Landing Testimonials Grid — 3-col responsive */}
        <LandingTestimonialsSection />

        {/* 4.9 Landing FAQ Section — extended Q&A accordion */}
        <FAQSection />

        {/* 9. Objection Elimination */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 max-w-[1400px]">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black tracking-tight mb-4">{t("faq.title")}</h2>
              <p className="text-muted-foreground text-xl">{t("faq.description")}</p>
            </div>

            {/* FAQ Accordion — full width */}
            <div className="max-w-3xl mx-auto">
              <Accordion className="w-full bg-background rounded-3xl border border-border/50 shadow-sm p-4 md:p-8">
                <AccordionItem value="item-1" className="border-b border-border/50 text-lg">
                  <AccordionTrigger className="py-6 font-semibold">
                    {t("faq.q1.q")}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                    {t("faq.q1.a")}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border-b border-border/50 text-lg">
                  <AccordionTrigger className="py-6 font-semibold">
                    {t("faq.q2.q")}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                    {t("faq.q2.a")}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-b border-border/50 text-lg">
                  <AccordionTrigger className="py-6 font-semibold">
                    {t("faq.q3.q")}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                    {t("faq.q3.a")}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4" className="border-none text-lg">
                  <AccordionTrigger className="py-6 font-semibold">
                    {t("faq.q4.q")}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                    {t("faq.q4.a")}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* 6. Grand Finale CTA */}
        <section className="py-32 relative overflow-hidden bg-background">
          {/* Massive vibrant ambient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[500px] bg-primary/10 dark:bg-primary/20 blur-[120px] pointer-events-none rounded-full z-0" />

          <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl">
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-sm font-bold tracking-widest uppercase text-primary">
                Get Started
              </span>
            </div>

            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground text-balance mb-8">
              {t("cta.title")}
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              {t("cta.description")}
            </p>

            <Button
              size="lg"
              className="h-16 px-10 text-xl font-bold rounded-2xl shadow-xl shadow-primary/25 transition-all hover:scale-105 active:scale-95 group"
            >
              {t("cta.button")}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>

            <p className="mt-8 text-sm text-muted-foreground font-medium">{t("cta.license")}</p>
          </div>
        </section>

        <FooterMinimal />
      </main>
    </Suspense>
  );
}
