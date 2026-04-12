import { getTranslations, setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { FrictionlessRouting } from "@/components/landing/impact/FrictionlessRouting";
import { ImpactHero } from "@/components/landing/impact/ImpactHero";
import { InfrastructureGrid } from "@/components/landing/impact/InfrastructureGrid";
import { OrganizationalEvolution } from "@/components/landing/impact/OrganizationalEvolution";

import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);
  const t = await getTranslations({ locale: lang as Locale, namespace: "impact" });

  return {
    title: `${t("hero_title")} - Nebutra-Sailor Manifesto`,
    description: t("hero_subtitle"),
  };
}

export default async function ImpactPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <main
      id="main-content"
      className="flex flex-col min-h-screen bg-black text-white selection:bg-white/20 selection:text-white"
    >
      {/* Top Navbar overlapping the Hero */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      {/* Ⅰ. Philosophy: Infinite Fission over Infinite Expansion */}
      <ImpactHero />

      {/* Ⅱ. Infrastructure: The AI-Native Convergence */}
      <InfrastructureGrid />

      {/* Ⅲ. Routing: Frictionless Flow of Production Elements */}
      <FrictionlessRouting />

      {/* Ⅳ. Organization: Scaling via AI, Resisting Human Bureaucracy */}
      <OrganizationalEvolution />

      {/* Final Minimal Footer */}
      <div className="border-t border-white/10 dark:bg-black/95">
        <FooterMinimal />
      </div>
    </main>
  );
}
