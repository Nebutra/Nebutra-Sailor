import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { FeatureBentoCard } from "@/components/landing/features/FeatureBentoCard";
import { FeatureSmallCard } from "@/components/landing/features/FeatureSmallCard";
import { LARGE_FEATURES, SMALL_FEATURES } from "@/components/landing/features/features-data";
import { type Locale, routing } from "@/i18n/routing";

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
  return {
    title: `Features — Nebutra`,
    description: t("hero.description"),
    alternates: { canonical: `/${lang}/features` },
  };
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

      {/* Hero */}
      <section className="relative mx-auto max-w-5xl px-4 pt-32 pb-20 text-center sm:px-6 lg:px-8 mt-16">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

        <AnimateIn preset="emerge" inView>
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-8 tracking-wider uppercase backdrop-blur-md">
            {t("hero.badge")}
          </div>
          <h1 className="text-5xl font-black tracking-tighter sm:text-7xl mb-8 leading-[1.1]">
            {t("hero.headlinePrefix")}
            <span
              className="text-transparent bg-clip-text"
              style={{
                background: "var(--brand-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t("hero.headlineHighlight")}
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed font-medium">
            {t("hero.description")}
          </p>
        </AnimateIn>
      </section>

      {/* Main Feature Bento Grid */}
      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-8">
        <AnimateInGroup stagger="normal" className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {LARGE_FEATURES.map((section, idx) => {
            return (
              <div
                key={section.categoryKey}
                className={`
                  ${idx === 0 ? "md:col-span-4" : ""}
                  ${idx === 1 ? "md:col-span-2" : ""}
                  ${idx === 2 ? "md:col-span-2" : ""}
                  ${idx === 3 ? "md:col-span-4" : ""}
                  ${idx === 4 ? "md:col-span-3" : ""}
                  ${idx === 5 ? "md:col-span-3" : ""}
                `}
              >
                <FeatureBentoCard {...section} t={t} />
              </div>
            );
          })}
        </AnimateInGroup>
      </section>

      {/* Small Feature Grid */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-32 sm:px-6 lg:px-8">
        <AnimateInGroup
          stagger="fast"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {SMALL_FEATURES.flatMap((section) =>
            section.features.map((feature: { titleKey: string; descKey: string }) => (
              <FeatureSmallCard
                key={feature.titleKey}
                icon={section.icon}
                titleKey={feature.titleKey}
                descKey={feature.descKey}
                t={t}
              />
            )),
          )}
        </AnimateInGroup>
      </section>

      <FooterMinimal />
    </main>
  );
}
