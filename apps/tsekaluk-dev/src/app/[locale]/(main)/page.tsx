import type { Metadata } from "next";
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

const BASE_URL = "https://tsekaluk.dev";

const meta: Record<string, { title: string; description: string }> = {
  en: {
    title: "Tseka Luk — AI-Native Builder",
    description:
      "CEO & AI-Native Builder at Nebutra Intelligence. Building intelligent systems, not just products.",
  },
  zh: {
    title: "Tseka Luk — AI 原生构建者",
    description: "斗星集团 CEO，AI 原生構建者。构建智能系统，而非仅仅是产品。",
  },
  ja: {
    title: "Tseka Luk — AI-Nativeビルダー",
    description:
      "Nebutra Intelligence CEO、AI-Nativeビルダー。プロダクトだけでなくインテリジェントなシステムを構築しています。",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { title, description } = meta[locale] ?? meta.en;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}`,
      siteName: "Tseka Luk",
      locale: locale === "zh" ? "zh_CN" : locale === "ja" ? "ja_JP" : "en_US",
      type: "website",
      images: [
        `/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`,
      ],
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages: { en: `${BASE_URL}/en`, zh: `${BASE_URL}/zh`, ja: `${BASE_URL}/ja` },
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
