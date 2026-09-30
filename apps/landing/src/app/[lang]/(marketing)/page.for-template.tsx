import { getTranslations, setRequestLocale } from "next-intl/server";
import { StarterCta } from "@/components/starter/starter-cta";
import { StarterFaq } from "@/components/starter/starter-faq";
import { StarterFeatures } from "@/components/starter/starter-features";
import { StarterHero } from "@/components/starter/starter-hero";
import { StarterPricing } from "@/components/starter/starter-pricing";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "site.meta" });
  return buildPageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/",
    locale: lang as Locale,
  });
}

/**
 * Your product's home page. The words are in messages/en.json → site.*; the
 * sections are in src/components/starter/ — reorder, drop or add them here.
 */
export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  return (
    <main id="main-content" className="flex flex-1 flex-col overflow-x-hidden">
      <StarterHero locale={lang} />
      <StarterFeatures locale={lang} />
      <StarterPricing locale={lang} />
      <StarterFaq locale={lang} />
      <StarterCta locale={lang} />
    </main>
  );
}
