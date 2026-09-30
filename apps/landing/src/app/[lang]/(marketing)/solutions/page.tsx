import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FinalCTA } from "@/components/landing";
import { SolutionsIndex } from "@/components/landing/solutions/SolutionsIndex";
import { type Locale, routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "solutionsCatalog.meta" });
  return buildPageMetadata({
    title: t("indexTitle"),
    description: t("indexDescription"),
    path: "/solutions",
    locale: lang as Locale,
  });
}

export default async function SolutionsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <main
      id="main-content"
      className="relative flex-1 overflow-hidden bg-background selection:bg-primary/30"
    >
      <SolutionsIndex locale={lang as Locale} />
      <FinalCTA />
    </main>
  );
}
