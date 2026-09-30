import { brand } from "@nebutra/brand/metadata";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StarterCta } from "@/components/starter/starter-cta";
import { StarterFaq } from "@/components/starter/starter-faq";
import { StarterPricing } from "@/components/starter/starter-pricing";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "site.pricing" });
  return buildPageMetadata({
    title: `${t("eyebrow")} — ${brand.name}`,
    description: t("lead"),
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
