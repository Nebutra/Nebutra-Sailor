import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { sitePageMeta } from "@/nebutra/seo";
import { StudioWorkbench } from "@/nebutra/studio/studio-workbench";
import "@/nebutra/studio/studio.css";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "studioPage" });
  return buildPageMetadata(
    await sitePageMeta(lang, "/sailor/studio", {
      description: t("meta.description"),
    }),
  );
}

/**
 * Sailor Studio — where a project's look is chosen (ADR 2026-09-27 Sailor
 * Studio). A tool: the site map gives it `chrome: "tool"`, so the frame hands
 * it everything under the top bar, and it fills that instead of scrolling.
 */
export default async function StudioPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Sailor Studio">
      <StudioWorkbench />
    </section>
  );
}
