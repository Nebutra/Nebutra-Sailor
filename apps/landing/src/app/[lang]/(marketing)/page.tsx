import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { HeroMockupWindow, LogoStrip, Navbar } from "@/components/landing";
import { DesktopProductDemoSection } from "@/components/landing/DesktopProductDemoSection";
import { HeroSection } from "@/components/landing/HeroSection";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

// Skeleton uses min-h so longer locales don't clip. Heights track real
// section sizes to keep CLS down while content streams in; mobile uses a
// separate contract because several dense demos are intentionally removed.
const SectionSkeleton = ({
  minH = "32rem",
  mobileMinH = "24rem",
}: {
  minH?: string;
  mobileMinH?: string;
}) => (
  <section
    aria-hidden
    className="w-full min-h-[var(--section-skeleton-mobile-min-h)] md:min-h-[var(--section-skeleton-min-h)]"
    style={
      {
        "--section-skeleton-min-h": minH,
        "--section-skeleton-mobile-min-h": mobileMinH,
      } as CSSProperties
    }
  />
);

const AIConstellationMarquee = dynamic(
  () => import("@/components/landing/AIConstellationMarquee").then((m) => m.AIConstellationMarquee),
  { loading: () => <SectionSkeleton minH="14rem" mobileMinH="10rem" /> },
);

const CapabilityMatrixSection = dynamic(
  () =>
    import("@/components/landing/CapabilityMatrixSection").then((m) => m.CapabilityMatrixSection),
  { loading: () => <SectionSkeleton minH="56rem" mobileMinH="42rem" /> },
);

const UseCasesSection = dynamic(
  () => import("@/components/landing/use-cases/UseCasesSection").then((m) => m.UseCasesSection),
  { loading: () => <SectionSkeleton minH="56rem" mobileMinH="34rem" /> },
);

const DesignSystemSection = dynamic(
  () => import("@/components/landing/DesignSystemSection").then((m) => m.DesignSystemSection),
  { loading: () => <SectionSkeleton minH="48rem" mobileMinH="38rem" /> },
);

const PricingSection = dynamic(
  () => import("@/components/landing/PricingSection").then((m) => m.PricingSection),
  { loading: () => <SectionSkeleton minH="56rem" mobileMinH="42rem" /> },
);

const FAQSection = dynamic(
  () => import("@/components/landing/faq-section").then((m) => m.FAQSection),
  { loading: () => <SectionSkeleton minH="36rem" mobileMinH="28rem" /> },
);

const FooterMinimal = dynamic(
  () => import("@/components/landing/FooterMinimal").then((m) => m.FooterMinimal),
  { loading: () => <SectionSkeleton minH="20rem" mobileMinH="16rem" /> },
);

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });

  return buildPageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/",
    locale,
  });
}

export default async function MarketingHomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as Locale;
  setRequestLocale(locale);

  return (
    <Suspense>
      {/* React 19 hoists these to <head>. Keep the decorative hero video out of
          the preload scanner; preconnect is enough and avoids competing with
          text/CSS during LCP. */}
      <link rel="preconnect" href="https://d8j0ntlcm91z4.cloudfront.net" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://d8j0ntlcm91z4.cloudfront.net" />
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
          <DesktopProductDemoSection />
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
