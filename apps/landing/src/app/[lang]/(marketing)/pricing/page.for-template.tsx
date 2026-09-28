import { brand } from "@nebutra/brand/metadata";
import { setRequestLocale } from "next-intl/server";
import { say } from "@/components/starter/starter-copy";
import { StarterCta } from "@/components/starter/starter-cta";
import { StarterFaq } from "@/components/starter/starter-faq";
import { StarterPricing } from "@/components/starter/starter-pricing";
import { SITE } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata({
    title: `${say(SITE.pricing.eyebrow, lang)} — ${brand.name}`,
    description: say(SITE.pricing.lead, lang),
    path: "/pricing",
    locale: lang as Locale,
  });
}

/** The plans, the questions people ask before buying, and the call to action. */
export default async function PricingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  return (
    <main id="main-content" className="flex flex-1 flex-col overflow-x-hidden pt-16">
      <StarterPricing locale={lang} level={1} />
      <StarterFaq locale={lang} />
      <StarterCta locale={lang} />
    </main>
  );
}
