import { setRequestLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { sitePageMeta } from "@/nebutra/seo";
import { StudioWorkbench } from "@/nebutra/studio/studio-workbench";
import "@/nebutra/studio/studio.css";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(
    sitePageMeta(lang, "/sailor/studio", {
      description:
        "Choose how a Sailor project looks, preview it on real pages, and apply it with one command.",
    }),
  );
}

/**
 * Sailor Studio — where a project's look is chosen (ADR 2026-09-27 Sailor
 * Studio). A tool, so it takes the full height of the viewport beside the rail.
 */
export default async function StudioPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  return (
    <section className="flex h-dvh min-h-0 flex-col" aria-label="Sailor Studio">
      <StudioWorkbench />
    </section>
  );
}
