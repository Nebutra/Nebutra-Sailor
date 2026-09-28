import { setRequestLocale } from "next-intl/server";
import { say } from "@/components/starter/starter-copy";
import { StarterCta } from "@/components/starter/starter-cta";
import { StarterFaq } from "@/components/starter/starter-faq";
import { StarterFeatures } from "@/components/starter/starter-features";
import { StarterHero } from "@/components/starter/starter-hero";
import { StarterPricing } from "@/components/starter/starter-pricing";
import { SITE } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata({
    title: say(SITE.meta.title, lang),
    description: say(SITE.meta.description, lang),
    path: "/",
    locale: lang as Locale,
  });
}

/**
 * Your product's home page. The words are in src/content/site.ts; the sections
 * are in src/components/starter/ — reorder, drop or add them here.
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
