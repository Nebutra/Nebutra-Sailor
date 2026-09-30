import { brand } from "@nebutra/brand/metadata";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StarterFaq } from "@/components/starter/starter-faq";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "site.faq" });
  return buildPageMetadata({
    title: `${t("title")} — ${brand.name}`,
    description: t("lead"),
    path: "/faq",
    locale: lang as Locale,
  });
}

/** The questions from src/content/site.ts, on a page of their own. */
export default async function FaqPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <StarterFaq locale={lang} level={1} />
    </div>
  );
}
