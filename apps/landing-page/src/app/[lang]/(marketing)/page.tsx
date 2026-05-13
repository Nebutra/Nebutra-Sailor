import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { HeroMockupWindow, LogoStrip, Navbar } from "@/components/landing";
import { HERO_BACKGROUND_VIDEOS } from "@/components/landing/HeroBackgroundVideo";
import { HeroSection } from "@/components/landing/HeroSection";
import type { Locale } from "@/i18n/routing";

// Skeleton uses min-h so longer locales don't clip. Heights track real
// section sizes to keep CLS down while content streams in.
const SectionSkeleton = ({ minH = "32rem" }: { minH?: string }) => (
  <section aria-hidden className="w-full" style={{ minHeight: minH }} />
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

const UseCasesSection = dynamic(
  () => import("@/components/landing/use-cases/UseCasesSection").then((m) => m.UseCasesSection),
  { loading: () => <SectionSkeleton minH="56rem" /> },
);

const DesignSystemSection = dynamic(
  () => import("@/components/landing/DesignSystemSection").then((m) => m.DesignSystemSection),
  { loading: () => <SectionSkeleton minH="48rem" /> },
);

const PricingSection = dynamic(
  () => import("@/components/landing/PricingSection").then((m) => m.PricingSection),
  { loading: () => <SectionSkeleton minH="56rem" /> },
);

const FAQSection = dynamic(
  () => import("@/components/landing/faq-section").then((m) => m.FAQSection),
  { loading: () => <SectionSkeleton minH="36rem" /> },
);

const FooterMinimal = dynamic(
  () => import("@/components/landing/FooterMinimal").then((m) => m.FooterMinimal),
  { loading: () => <SectionSkeleton minH="20rem" /> },
);

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
          {/* 1. Hero */}
          <HeroSection />

          {/* 2. Trust strip */}
          <LogoStrip locale={lang as Locale} />

          {/* 3. Hero Mockup */}
          <section className="relative z-20 w-full overflow-visible bg-transparent pb-32 pt-2">
            <HeroMockupWindow />
          </section>
        </div>

        {/* 4. AI Constellation Marquee */}
        <AIConstellationMarquee />

        {/* 5. Product Demo */}
        <div id="demo" className="scroll-mt-24">
          <ProductDemoSection />
        </div>

        {/* 6. Capability Matrix */}
        <CapabilityMatrixSection />

        {/* 7. Design System */}
        <DesignSystemSection />

        {/* 8. Use Cases */}
        <UseCasesSection />

        {/* 9. Pricing */}
        <PricingSection />

        {/* 10. FAQ */}
        <FAQSection />

        {/* Footer (includes Final CTA at top) */}
        <FooterMinimal showFinalCta />
      </main>
    </Suspense>
  );
}
