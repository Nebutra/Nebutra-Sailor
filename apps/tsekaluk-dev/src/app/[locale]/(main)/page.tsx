import { DEFAULT_ROUTE_LOCALE, toOpenGraphLocale } from "@nebutra/i18n/locales";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ConstellationSection } from "@/components/sections/constellation-section";
import { FocusSection } from "@/components/sections/focus-section";
import { Hero } from "@/components/sections/hero";
import { NowPreview } from "@/components/sections/now-preview";
import { ProcessSection } from "@/components/sections/process-section";
import { SelectedWorks } from "@/components/sections/selected-works";
import { TechMarquee } from "@/components/sections/tech-marquee";
import { GithubMetrics } from "@/components/ui/github-metrics";
import { getLocalizedProjects } from "@/lib/projects";
import { alternatesFor, canonicalFor } from "@/lib/seo/alternates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  // Title and description come from the message catalogs, not a hand-written
  // three-language record. The old `meta` map served English to every route
  // locale outside {en, zh, ja}; `pages.home` is seeded in en/zh-Hans/ja and
  // filled for the rest by the repo's auto-translate flow, with an explicit
  // English fallback in the meantime rather than a MISSING_MESSAGE placeholder.
  const [t, fallback] = await Promise.all([
    getTranslations({ locale, namespace: "pages.home" }),
    getTranslations({ locale: DEFAULT_ROUTE_LOCALE, namespace: "pages.home" }),
  ]);
  const title = t.has("metadata_title") ? t("metadata_title") : fallback("metadata_title");
  const description = t.has("metadata_desc") ? t("metadata_desc") : fallback("metadata_desc");

  // The homepage is `ui` — every route locale is a canonical URL for it. The
  // cluster used to be a hand-written { en, zh, ja } whose bare `zh` is not a
  // route locale and cannot be resolved by the router.
  const canonical = canonicalFor("", locale, "ui");
  const alternates = alternatesFor("", locale, "ui");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Tseka Luk",
      locale: toOpenGraphLocale(locale),
      type: "website",
      images: [
        `/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`,
      ],
    },
    alternates: {
      canonical,
      ...(alternates ?? {}),
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const localizedProjects = await getLocalizedProjects(locale);

  return (
    <>
      <Hero />
      <TechMarquee>
        <Suspense
          fallback={
            <div className="mt-12 w-full">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100 dark:divide-white/[0.05]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-center gap-0 py-10 px-6"
                  >
                    <div className="h-14 w-24 rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    <div className="mt-4 h-3 w-16 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    <div className="mt-1 h-2.5 w-20 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <GithubMetrics />
        </Suspense>
      </TechMarquee>
      <FocusSection />
      <ProcessSection />
      <SelectedWorks projects={localizedProjects} />
      <ConstellationSection />
      <NowPreview />
    </>
  );
}
