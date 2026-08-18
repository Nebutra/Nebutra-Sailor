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

/**
 * Each section streams into its own boundary, with the skeleton as that
 * boundary's fallback.
 *
 * These were `dynamic(..., { loading: () => <SectionSkeleton/> })`. On a server
 * component that resolves the import and streams the real section, while the
 * client's lazy component renders the skeleton until its chunk lands — so React
 * hydrated a skeleton against real markup and threw a recoverable mismatch for
 * every one of them, regenerating seven subtrees on the client. It was
 * invisible: the content was correct either way, and the only evidence was six
 * minified #418s in the console on the homepage and nowhere else.
 *
 * As a Suspense fallback the skeleton shows while the boundary is pending and
 * is replaced by the same markup the server sent, which is what a fallback is.
 */
const AIConstellationMarquee = dynamic(() =>
  import("@/components/landing/AIConstellationMarquee").then((m) => m.AIConstellationMarquee),
);

const CapabilityMatrixSection = dynamic(() =>
  import("@/components/landing/CapabilityMatrixSection").then((m) => m.CapabilityMatrixSection),
);

const UseCasesSection = dynamic(() =>
  import("@/components/landing/use-cases/UseCasesSection").then((m) => m.UseCasesSection),
);

const DesignSystemSection = dynamic(() =>
  import("@/components/landing/DesignSystemSection").then((m) => m.DesignSystemSection),
);

const PricingSection = dynamic(() =>
  import("@/components/landing/PricingSection").then((m) => m.PricingSection),
);

const FAQSection = dynamic(() =>
  import("@/components/landing/faq-section").then((m) => m.FAQSection),
);

const FooterMinimal = dynamic(() =>
  import("@/components/landing/FooterMinimal").then((m) => m.FooterMinimal),
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
        <Suspense fallback={<SectionSkeleton minH="14rem" mobileMinH="10rem" />}>
          <AIConstellationMarquee />
        </Suspense>

        {/* 5. Product Demo */}
        <div id="demo" className="scroll-mt-24">
          <DesktopProductDemoSection />
        </div>

        {/* 6. Capability Matrix */}
        <Suspense fallback={<SectionSkeleton minH="56rem" mobileMinH="42rem" />}>
          <CapabilityMatrixSection />
        </Suspense>

        {/* 7. Design System */}
        <Suspense fallback={<SectionSkeleton minH="48rem" mobileMinH="38rem" />}>
          <DesignSystemSection />
        </Suspense>

        {/* 8. Use Cases */}
        <Suspense fallback={<SectionSkeleton minH="56rem" mobileMinH="34rem" />}>
          <UseCasesSection />
        </Suspense>

        {/* 9. Pricing */}
        <Suspense fallback={<SectionSkeleton minH="56rem" mobileMinH="42rem" />}>
          <PricingSection />
        </Suspense>

        {/* 10. FAQ */}
        <Suspense fallback={<SectionSkeleton minH="36rem" mobileMinH="28rem" />}>
          <FAQSection />
        </Suspense>

        {/* Footer (includes Final CTA at top) */}
        <Suspense fallback={<SectionSkeleton minH="20rem" mobileMinH="16rem" />}>
          <FooterMinimal showFinalCta />
        </Suspense>
      </main>
    </Suspense>
  );
}
