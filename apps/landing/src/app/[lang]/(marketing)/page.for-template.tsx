import { getTranslations, setRequestLocale } from "next-intl/server";
import { FinalCTA, HeroMockupWindow, LogoStrip, PricingSection } from "@/components/landing";
import { AIConstellationMarquee } from "@/components/landing/AIConstellationMarquee";
import { CapabilityMatrixSection } from "@/components/landing/CapabilityMatrixSection";
import { DesignSystemSection } from "@/components/landing/DesignSystemSection";
import { FAQSection } from "@/components/landing/faq-section";
import { HeroSection } from "@/components/landing/HeroSection";
import { UseCasesSection } from "@/components/landing/use-cases/UseCasesSection";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

/**
 * Every section is in the server-rendered HTML, in place.
 *
 * Sections used to sit in their own <Suspense> boundaries around `dynamic()`
 * imports. React 19 streams a completed boundary out of line once the document
 * passes ~12.8 KB: the fallback stays where the section belongs and the section
 * arrives in a `<div hidden>` that an inline script moves into place. A reader
 * that runs no JavaScript — search and AI crawlers, HTML-to-text extractors —
 * got empty skeletons. Client sections are plain imports: a Server Component
 * already code-splits them into their own client chunks, and a plain import
 * has no lazy wrapper to hydrate a skeleton against real markup (the #418
 * mismatch `dynamic(..., { loading })` caused). Guarded by
 * scripts/verify-landing-ssr.mjs.
 */
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
    <>
      {/* React 19 hoists these to <head>. Keep the decorative hero video out of
          the preload scanner; preconnect is enough and avoids competing with
          text/CSS during LCP. */}
      <link rel="preconnect" href="https://d8j0ntlcm91z4.cloudfront.net" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://d8j0ntlcm91z4.cloudfront.net" />
      <main id="main-content" className="flex flex-col flex-1 bg-background overflow-x-hidden">
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

        {/* 5. Capability Matrix */}
        <CapabilityMatrixSection />

        {/* 6. Design System */}
        <DesignSystemSection />

        {/* 7. Use Cases */}
        <UseCasesSection />

        {/* 8. Pricing */}
        <PricingSection />

        {/* 9. FAQ */}
        <FAQSection />

        {/* Final CTA — sits directly above the layout's footer */}
        <FinalCTA />
      </main>
    </>
  );
}
