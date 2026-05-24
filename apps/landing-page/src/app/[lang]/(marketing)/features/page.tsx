import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { CapabilityFolderShowcase } from "@/components/landing/features/CapabilityFolderShowcase";
import { FeatureHero } from "@/components/landing/features/FeatureHero";
import { DEFAULT_GROUP_TOKENS } from "@/components/landing/features/feature-group-tokens";
import { type Locale, routing } from "@/i18n/routing";
import { createPublicDocsUrl } from "@/lib/docs-links";
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
  const t = await getTranslations({ locale: lang as Locale, namespace: "featuresPage" });
  return buildPageMetadata({
    title: "Nebutra Features | AI-Native SaaS Platform",
    description: t("hero.description"),
    path: "/features",
    locale: lang as Locale,
  });
}

export default async function FeaturesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const t = await getTranslations({ locale: lang as Locale, namespace: "featuresPage" });

  return (
    <main
      id="main-content"
      className="min-h-screen bg-background selection:bg-primary/30 relative overflow-hidden"
    >
      <Navbar />

      <FeatureHero
        align="center"
        tokens={DEFAULT_GROUP_TOKENS}
        eyebrow={t("hero.badge")}
        titlePrefix={t("hero.headlinePrefix")}
        titleSuffix={t("hero.headlineHighlight")}
        summary={t("hero.description")}
        primaryCtaHref={createPublicDocsUrl(DEFAULT_GROUP_TOKENS.docsPath)}
        primaryCtaLabel={t("sections.exploreFeature")}
      />

      <CapabilityFolderShowcase locale={lang as Locale} />

      <FooterMinimal showFinalCta />
    </main>
  );
}
