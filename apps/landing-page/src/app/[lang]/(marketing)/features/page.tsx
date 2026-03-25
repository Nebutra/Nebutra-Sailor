import {
  BarChart as BarChart3,
  Cpu,
  Database,
  Globe,
  Key,
  Layers,
  Shield,
  Workflow,
  Lightning as Zap,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
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

const FEATURE_KEYS = [
  {
    categoryKey: "ai_category",
    icon: Cpu,
    color: "var(--blue-9)",
    features: [
      { titleKey: "ai_f1_title", descKey: "ai_f1_desc" },
      { titleKey: "ai_f2_title", descKey: "ai_f2_desc" },
      { titleKey: "ai_f3_title", descKey: "ai_f3_desc" },
    ],
  },
  {
    categoryKey: "multi_category",
    icon: Layers,
    color: "var(--cyan-9)",
    features: [
      { titleKey: "multi_f1_title", descKey: "multi_f1_desc" },
      { titleKey: "multi_f2_title", descKey: "multi_f2_desc" },
      { titleKey: "multi_f3_title", descKey: "multi_f3_desc" },
    ],
  },
  {
    categoryKey: "dx_category",
    icon: Key,
    color: "var(--blue-9)",
    features: [
      { titleKey: "dx_f1_title", descKey: "dx_f1_desc" },
      { titleKey: "dx_f2_title", descKey: "dx_f2_desc" },
      { titleKey: "dx_f3_title", descKey: "dx_f3_desc" },
    ],
  },
  {
    categoryKey: "billing_category",
    icon: BarChart3,
    color: "var(--cyan-9)",
    features: [
      { titleKey: "billing_f1_title", descKey: "billing_f1_desc" },
      { titleKey: "billing_f2_title", descKey: "billing_f2_desc" },
      { titleKey: "billing_f3_title", descKey: "billing_f3_desc" },
    ],
  },
  {
    categoryKey: "rel_category",
    icon: Zap,
    color: "var(--blue-9)",
    features: [
      { titleKey: "rel_f1_title", descKey: "rel_f1_desc" },
      { titleKey: "rel_f2_title", descKey: "rel_f2_desc" },
      { titleKey: "rel_f3_title", descKey: "rel_f3_desc" },
    ],
  },
  {
    categoryKey: "sec_category",
    icon: Shield,
    color: "var(--cyan-9)",
    features: [
      { titleKey: "sec_f1_title", descKey: "sec_f1_desc" },
      { titleKey: "sec_f2_title", descKey: "sec_f2_desc" },
      { titleKey: "sec_f3_title", descKey: "sec_f3_desc" },
    ],
  },
  {
    categoryKey: "obs_category",
    icon: Globe,
    color: "var(--blue-9)",
    features: [
      { titleKey: "obs_f1_title", descKey: "obs_f1_desc" },
      { titleKey: "obs_f2_title", descKey: "obs_f2_desc" },
      { titleKey: "obs_f3_title", descKey: "obs_f3_desc" },
    ],
  },
  {
    categoryKey: "data_category",
    icon: Database,
    color: "var(--cyan-9)",
    features: [
      { titleKey: "data_f1_title", descKey: "data_f1_desc" },
      { titleKey: "data_f2_title", descKey: "data_f2_desc" },
      { titleKey: "data_f3_title", descKey: "data_f3_desc" },
    ],
  },
  {
    categoryKey: "infra_category",
    icon: Workflow,
    color: "var(--blue-9)",
    features: [
      { titleKey: "infra_f1_title", descKey: "infra_f1_desc" },
      { titleKey: "infra_f2_title", descKey: "infra_f2_desc" },
      { titleKey: "infra_f3_title", descKey: "infra_f3_desc" },
    ],
  },
] as const;

export default async function FeaturesPage({ params }: { params: Promise<{ lang: string }> }) {
  "use cache";
  cacheLife("days");

  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const t = await getTranslations({ locale: lang as Locale, namespace: "featuresPage" });

  return (
    <main
      id="main-content"
      className="min-h-screen bg-white dark:bg-black selection:bg-primary/30 relative overflow-hidden"
    >
      <Navbar />

      {/* Hero */}
      <section className="relative mx-auto max-w-5xl px-4 pt-32 pb-24 text-center sm:px-6 lg:px-8 mt-16">
        {/* Glow effect */}
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
          <p className="mx-auto max-w-2xl text-lg text-[var(--neutral-11)] leading-relaxed font-medium">
            {t("hero.description")}
          </p>
        </AnimateIn>
      </section>

      {/* Feature sections */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-40 sm:px-6 lg:px-8">
        <div className="space-y-32">
          {FEATURE_KEYS.map((section) => (
            <div key={section.categoryKey} className="relative">
              <AnimateIn preset="fadeUp" inView>
                <div className="mb-12 flex flex-col items-center justify-center gap-5 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/50 border border-border/40 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
                    <section.icon
                      className="h-6 w-6"
                      style={{ color: section.color }}
                      aria-hidden
                    />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight text-[var(--neutral-12)]">
                    {t(`sections.${section.categoryKey}` as any)}
                  </h2>
                </div>
              </AnimateIn>

              <AnimateInGroup
                stagger="fast"
                className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                {section.features.map((feature) => (
                  <AnimateIn key={feature.titleKey} preset="fadeUp" className="h-full">
                    <div className="group relative h-full w-full overflow-hidden rounded-3xl border border-border/40 bg-background/40 backdrop-blur-2xl p-8 transition-all duration-500 hover:bg-muted/30 hover:border-border/80 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
                      {/* Subtle gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

                      <h3 className="relative z-10 text-lg font-bold tracking-tight text-[var(--neutral-12)]">
                        {t(`sections.${feature.titleKey}` as any)}
                      </h3>
                      <p className="relative z-10 mt-3 text-sm leading-relaxed text-[var(--neutral-11)] font-medium group-hover:text-[var(--neutral-12)] transition-colors duration-300">
                        {t(`sections.${feature.descKey}` as any)}
                      </p>
                    </div>
                  </AnimateIn>
                ))}
              </AnimateInGroup>
            </div>
          ))}
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
