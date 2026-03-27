import { LogomarkSVG } from "@nebutra/brand";
import { ArrowRight, CheckCircle, Database, Shield } from "@nebutra/icons";
import {
  ClerkIcon,
  NextjsIcon,
  PrismaIcon,
  StripeIcon,
  SupabaseIcon,
  TailwindIcon,
} from "@nebutra/ui/icons";
import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import {
  FooterMinimal,
  HeroMockupWindow,
  HeroSection,
  LogoStrip,
  Navbar,
  PricingSection,
} from "@/components/landing";
import { FALLBACK_POSTS } from "@/lib/blog-fallback";
import { getGitHubStars } from "@/lib/github";

const ProductShowcase = dynamic(
  () => import("@/components/landing").then((mod) => mod.ProductShowcase),
  { loading: () => <section className="h-96" aria-hidden /> },
);

const ProductDemoSection = dynamic(
  () => import("@/components/landing/ProductDemoSection").then((mod) => mod.ProductDemoSection),
  { loading: () => <section className="h-72" aria-hidden /> },
);

const AIConstellationMarquee = dynamic(
  () =>
    import("@/components/landing/AIConstellationMarquee").then((mod) => mod.AIConstellationMarquee),
  { loading: () => <section className="h-40" aria-hidden /> },
);

const CapabilityMatrixSection = dynamic(
  () =>
    import("@/components/landing/CapabilityMatrixSection").then(
      (mod) => mod.CapabilityMatrixSection,
    ),
  { loading: () => <section className="h-96" aria-hidden /> },
);

const VelocityEngineSection = dynamic(
  () =>
    import("@/components/landing/VelocityEngineSection").then((mod) => mod.VelocityEngineSection),
  { loading: () => <section className="h-64" aria-hidden /> },
);

const TestimonialsSection = dynamic(
  () => import("@/components/landing/TestimonialsSection").then((mod) => mod.TestimonialsSection),
  { loading: () => <section className="h-72" aria-hidden /> },
);

const AlternativeComparison = dynamic(
  () =>
    import("@/components/landing/AlternativeComparison").then((mod) => mod.AlternativeComparison),
  { loading: () => <div className="h-80" aria-hidden /> },
);

const AgenticCapabilitiesSection = dynamic(
  () =>
    import("@/components/landing/AgenticCapabilitiesSection").then(
      (mod) => mod.AgenticCapabilitiesSection,
    ),
  { loading: () => <section className="h-96" aria-hidden /> },
);

const UseCasesSection = dynamic(
  () => import("@/components/landing/use-cases/UseCasesSection").then((mod) => mod.UseCasesSection),
  { loading: () => <section className="h-96" aria-hidden /> },
);

const AgenticEngineeringSection = dynamic(
  () => import("@/components/landing").then((mod) => mod.AgenticEngineeringSection),
  { loading: () => <section className="h-96" aria-hidden /> },
);

const HarnessEngineeringSection = dynamic(
  () => import("@/components/landing").then((mod) => mod.HarnessEngineeringSection),
  { loading: () => <section className="h-96" aria-hidden /> },
);

const DesignSystemSection = dynamic(
  () => import("@/components/landing").then((mod) => mod.DesignSystemSection),
  { loading: () => <section className="h-96" aria-hidden /> },
);

const BlogShowcase = dynamic(() => import("@/components/landing").then((mod) => mod.BlogShowcase), {
  loading: () => <section className="h-72" aria-hidden />,
});

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
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
  const stars = await getGitHubStars();

  return (
    <Suspense>
      <main
        id="main-content"
        className="flex flex-col min-h-screen bg-background overflow-x-hidden"
      >
        <Navbar />
        {/* 1. Hero Section */}
        <HeroSection />

        {/* 2. Trust Badges / Quick Logo Bar */}
        <LogoStrip locale={lang as Locale} />

        {/* 2.5 Hero Mockup Window */}
        <section className="relative w-full overflow-hidden bg-background pb-32 pt-2">
          <HeroMockupWindow />
        </section>

        {/* 2.8 AI Constellation Marquee */}
        <AIConstellationMarquee />

        {/* 3. Product Showcase */}
        <ProductShowcase />

        {/* 4. Capability Matrix + Agentic Capabilities */}
        <CapabilityMatrixSection />
        <AgenticEngineeringSection />

        {/* 5. Product Demo + Velocity Engine */}
        <ProductDemoSection />
        <VelocityEngineSection />

        {/* 6. Harness Engineering */}
        <HarnessEngineeringSection />

        {/* 7. Testimonials */}
        <TestimonialsSection stars={stars} />

        {/* 7.5 Blog Showcase */}
        <BlogShowcase posts={FALLBACK_POSTS} />

        {/* 7.8 Design System */}
        <DesignSystemSection />

        <AgenticCapabilitiesSection />
        <UseCasesSection />

        {/* 7. System Architecture Transparency */}
        <section className="py-24 md:py-32 bg-muted/30 relative overflow-hidden">
          <div className="container relative z-10 mx-auto px-4 max-w-[1400px]">
            <div className="mb-16">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">
                {t("architecture.badge")}
              </p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-balance mb-6">
                {t("architecture.title")}
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl text-balance">
                {t("architecture.description")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* ML-7.3: Database */}
              <div className="col-span-1 relative rounded-[2.5rem] border border-border/40 bg-background/60 dark:bg-zinc-950/60 p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-2xl overflow-hidden backdrop-blur-2xl group transition-all hover:border-primary/40">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="bg-blue-500/10 p-3.5 rounded-2xl w-fit mb-6 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-shadow">
                    <Database className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-black text-foreground tracking-tight mb-3">
                    {t("architecture.database.title")}
                  </h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    {t("architecture.database.desc")}
                  </p>
                </div>
              </div>

              {/* ML-7.4: Auth — spans 2 cols */}
              <div className="col-span-1 md:col-span-2 relative rounded-[2.5rem] border border-border/40 bg-background/60 dark:bg-zinc-950/60 p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-2xl overflow-hidden backdrop-blur-2xl group transition-all hover:border-primary/40">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] dark:from-emerald-500/[0.04] to-transparent z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
                  <div className="flex-none bg-emerald-500/10 p-4 rounded-2xl w-fit border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-shadow">
                    <Shield className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-2xl font-black text-foreground tracking-tight">
                        {t("architecture.auth.title")}
                      </h3>
                      <div className="px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full">
                        SOC2 Ready
                      </div>
                    </div>
                    <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl">
                      {t("architecture.auth.desc")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. High-Contrast Pricing Investment Section */}
        <PricingSection />

        {/* 9. Objection Elimination */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 max-w-[1400px]">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black tracking-tight mb-4">{t("faq.title")}</h2>
              <p className="text-muted-foreground text-xl">{t("faq.description")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* ML-9.1: FAQ Accordion */}
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

              {/* ML-9.2: Alternative Comparison */}
              <AlternativeComparison />
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
