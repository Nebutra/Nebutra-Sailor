import { LogomarkSVG, WordmarkEnSVG } from "@nebutra/brand";
import {
  ArrowRight,
  CheckCircle,
  Database,
  Shield,
  Terminal as TerminalIcon,
} from "@nebutra/icons";
import {
  ClerkIcon,
  NextjsIcon,
  PrismaIcon,
  StripeIcon,
  SupabaseIcon,
  TailwindIcon,
} from "@nebutra/ui/icons";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { VelocitySignalStrip } from "@/components/landing/VelocitySignalStrip";

const ProductDemoSection = dynamic(
  () => import("@/components/landing").then((mod) => mod.ProductDemoSection),
  { loading: () => <section className="h-72" aria-hidden /> },
);

const AIConstellationMarquee = dynamic(
  () => import("@/components/landing").then((mod) => mod.AIConstellationMarquee),
  { loading: () => <section className="h-40" aria-hidden /> },
);

const CapabilityMatrixSection = dynamic(
  () => import("@/components/landing").then((mod) => mod.CapabilityMatrixSection),
  { loading: () => <section className="h-96" aria-hidden /> },
);

const VelocityEngineSection = dynamic(
  () => import("@/components/landing").then((mod) => mod.VelocityEngineSection),
  { loading: () => <section className="h-64" aria-hidden /> },
);

const TestimonialsSection = dynamic(
  () => import("@/components/landing").then((mod) => mod.TestimonialsSection),
  { loading: () => <section className="h-72" aria-hidden /> },
);

const MonorepoFileTree = dynamic(
  () => import("@/components/landing").then((mod) => mod.MonorepoFileTree),
  { loading: () => <div className="h-80" aria-hidden /> },
);

const BuildCostCalculator = dynamic(
  () => import("@/components/landing").then((mod) => mod.BuildCostCalculator),
  { loading: () => <div className="h-80" aria-hidden /> },
);

const AlternativeComparison = dynamic(
  () => import("@/components/landing").then((mod) => mod.AlternativeComparison),
  { loading: () => <div className="h-80" aria-hidden /> },
);

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AnimatedGradientText,
  AnimatedSpan,
  Badge,
  Button,
  Card,
  Terminal,
  TypingAnimation,
} from "@nebutra/ui/primitives";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  // @ts-expect-error - The locale is dynamically router-validated
  const t = await getTranslations({ locale: lang, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function MarketingHomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  // @ts-expect-error
  const t = await getTranslations({ locale: lang, namespace: "microLanding" });

  return (
    <main id="main-content" className="flex flex-col min-h-screen bg-background">
      <Navbar />
      {/* 1. Command Center Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[90vh]">
        {/* Abstract Architectural Grid Background */}
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

        {/* Ambient Plasma Glow */}
        <div className="absolute top-0 left-1/2 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 blur-[120px] pointer-events-none opacity-40 z-0">
          <div
            className="aspect-[2/1] rounded-full"
            style={{ background: "var(--brand-gradient)" }}
          />
        </div>

        <div className="container relative z-10 mx-auto px-4 max-w-5xl text-center">
          <div className="flex justify-center mb-6">
            <AnimatedGradientText className="px-5 py-2">
              <span className="text-sm font-medium tracking-tight bg-clip-text">
                {t("hero.badge")}
              </span>
            </AnimatedGradientText>
          </div>

          <div className="flex justify-center mb-8">
            <WordmarkEnSVG className="h-10 md:h-14 text-foreground drop-shadow-sm" />
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-balance leading-tight mb-8 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            {t("hero.headline")}
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto text-balance leading-relaxed mb-12">
            {t("hero.subheadline")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="h-14 px-8 text-lg font-bold w-full sm:w-auto rounded-xl">
              <TerminalIcon className="mr-2 h-5 w-5" /> {t("hero.initCmd")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-lg font-bold w-full sm:w-auto rounded-xl bg-background/50 backdrop-blur-md"
            >
              {t("hero.docsCmd")} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Animated Terminal Component */}
        <div className="relative w-full max-w-4xl mx-auto mt-20 px-4 z-10">
          <div className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-2xl shadow-2xl overflow-hidden p-[1px]">
            <Terminal className="min-h-[300px] border-none shadow-none rounded-xl">
              <TypingAnimation>
                &gt; pnpm create next-app --example nebutra-sailor my-empire
              </TypingAnimation>

              <AnimatedSpan delay={1500} className="text-green-500">
                <span>✔ Fetching enterprise architecture...</span>
              </AnimatedSpan>

              <AnimatedSpan delay={2000} className="text-green-500">
                <span>✔ Linking Prisma to Supabase Realtime...</span>
              </AnimatedSpan>

              <AnimatedSpan delay={2500} className="text-green-500">
                <span>✔ Authenticating Clerk Webhooks...</span>
              </AnimatedSpan>

              <AnimatedSpan delay={3000} className="text-blue-400">
                <span>ℹ Injecting Neural Engine capabilities...</span>
              </AnimatedSpan>

              <AnimatedSpan delay={3500} className="text-primary font-bold">
                <span>⚡ Project initialized successfully.</span>
              </AnimatedSpan>

              <TypingAnimation delay={4000} className="text-muted-foreground mt-4">
                &gt; cd my-empire && pnpm run dev
              </TypingAnimation>
            </Terminal>
          </div>
        </div>
      </section>

      {/* 1.3 Velocity Signal Strip */}
      <VelocitySignalStrip />

      {/* 2. Trust Badges / Quick Logo Bar */}
      <section className="py-16 md:py-20 border-b border-border bg-background flex flex-col justify-center overflow-hidden">
        <div className="container mx-auto px-4">
          {/* Foundation Stack */}
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 mb-10 text-center text-balance">
            {t("trust.foundation")}
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-14 items-center opacity-70 grayscale hover:grayscale-0 transition-all duration-1000 mb-16">
            <LogomarkSVG className="w-auto h-12 md:h-16 text-foreground drop-shadow-md" />
            <NextjsIcon size={40} className="w-auto h-8 md:h-10" />
            <SupabaseIcon size={40} className="w-auto h-8 md:h-10" />
            <PrismaIcon size={40} className="w-auto h-8 md:h-10" />
            <ClerkIcon size={40} className="w-auto h-8 md:h-10" />
            <StripeIcon size={40} className="w-auto h-8 md:h-10" />
            <TailwindIcon size={40} className="w-auto h-8 md:h-10" />
          </div>
        </div>
      </section>

      {/* 2.2 AI Model Constellation Marquee */}
      <AIConstellationMarquee />

      {/* 3. Product Demo + Capability Matrix + Velocity Engine */}
      <ProductDemoSection />
      <CapabilityMatrixSection />
      <VelocityEngineSection />
      <TestimonialsSection />

      {/* 7. System Architecture Transparency */}
      <section className="py-24 md:py-32 bg-muted/30 relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 max-w-6xl">
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
            {/* ML-7.1: Monorepo File Tree — spans full width */}
            <div className="col-span-1 md:col-span-3">
              <MonorepoFileTree />
            </div>

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
      <section className="py-24 md:py-32 bg-background relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[400px] bg-primary/20 blur-[150px] pointer-events-none rounded-full" />

        <div className="container relative mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
              {t("pricing.title")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              {t("pricing.description")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 md:p-12 border-border/50 bg-background/50 backdrop-blur-md rounded-[2.5rem]">
              <Badge
                className="mb-6 bg-muted text-muted-foreground border-border"
                variant="outline"
              >
                {t("pricing.standard.badge")}
              </Badge>
              <div className="mb-6 flex items-baseline">
                <span className="text-5xl font-black">{t("pricing.standard.price")}</span>
                <span className="text-muted-foreground font-medium ml-2">
                  / {t("pricing.standard.period")}
                </span>
              </div>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                {t("pricing.standard.desc")}
              </p>
              <Button className="w-full h-14 text-lg font-bold rounded-xl mb-8" variant="default">
                {t("pricing.standard.cta")}
              </Button>

              <div className="space-y-4">
                {[
                  t("pricing.standard.f1"),
                  t("pricing.standard.f2"),
                  t("pricing.standard.f3"),
                  t("pricing.standard.f4"),
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                    <span className="text-lg">{feature}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 md:p-12 border-primary/50 relative overflow-hidden bg-background/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-primary/10">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
              <Badge className="mb-6 bg-primary text-primary-foreground border-none">
                {t("pricing.enterprise.badge")}
              </Badge>
              <div className="mb-6 flex items-baseline">
                <span className="text-5xl font-black">{t("pricing.enterprise.price")}</span>
                <span className="text-muted-foreground font-medium ml-2">
                  / {t("pricing.enterprise.period")}
                </span>
              </div>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                {t("pricing.enterprise.desc")}
              </p>
              <Button className="w-full h-14 text-lg font-bold rounded-xl mb-8 shadow-lg shadow-primary/20">
                {t("pricing.enterprise.cta")}
              </Button>

              <div className="space-y-4">
                {[
                  t("pricing.enterprise.f1"),
                  t("pricing.enterprise.f2"),
                  t("pricing.enterprise.f3"),
                  t("pricing.enterprise.f4"),
                  t("pricing.enterprise.f5"),
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                    <span className="text-lg font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ML-8.2: Build Cost Reality Check */}
          <div className="mt-8 max-w-5xl mx-auto">
            <BuildCostCalculator />
          </div>
        </div>
      </section>

      {/* 9. Objection Elimination */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tight mb-4">{t("faq.title")}</h2>
            <p className="text-muted-foreground text-xl">{t("faq.description")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* ML-9.1: FAQ Accordion */}
            <Accordion className="w-full bg-background rounded-3xl border border-border/50 shadow-sm p-4 md:p-8">
              <AccordionItem value="item-1" className="border-b border-border/50 text-lg">
                <AccordionTrigger className="py-6 font-semibold">{t("faq.q1.q")}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                  {t("faq.q1.a")}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2" className="border-b border-border/50 text-lg">
                <AccordionTrigger className="py-6 font-semibold">{t("faq.q2.q")}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                  {t("faq.q2.a")}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className="border-b border-border/50 text-lg">
                <AccordionTrigger className="py-6 font-semibold">{t("faq.q3.q")}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                  {t("faq.q3.a")}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4" className="border-none text-lg">
                <AccordionTrigger className="py-6 font-semibold">{t("faq.q4.q")}</AccordionTrigger>
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

          <p className="mt-8 text-sm text-muted-foreground font-medium">
            Open source under MIT License. No credit card required.
          </p>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
