import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WorkGrid } from "@/components/sections/work-grid";
import { getLocalizedProjects } from "@/lib/projects";
import { seoFor } from "@/lib/seo/alternates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.work" });
  return {
    title: t("metadata_title"),
    description: t("metadata_desc"),
    openGraph: {
      images: [
        `/og?title=${encodeURIComponent(t("metadata_title"))}&subtitle=${encodeURIComponent(t("metadata_desc"))}`,
      ],
    },
    ...seoFor("/work", locale, "ui"),
  };
}

export default async function WorkPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [t, localizedProjects] = await Promise.all([
    getTranslations({ locale, namespace: "pages.work" }),
    getLocalizedProjects(locale),
  ]);

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
      <div className="mb-16">
        <p className="font-serif italic text-lg text-gray-400 dark:text-gray-500">{t("label")}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          {t("headline")}
        </h1>
        <p className="mt-4 text-base text-gray-500 dark:text-gray-400">{t("description")}</p>
      </div>

      <WorkGrid projects={localizedProjects} />
    </section>
  );
}
