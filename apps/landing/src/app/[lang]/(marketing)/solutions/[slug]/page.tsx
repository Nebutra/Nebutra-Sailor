import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FinalCTA } from "@/components/landing";
import { ChinaVcSolution } from "@/components/landing/solutions/china-vc/ChinaVcSolution";
import { GlobalVcSolution } from "@/components/landing/solutions/global-vc/GlobalVcSolution";
import { SolutionPage } from "@/components/landing/solutions/SolutionPage";
import { prerenderDefaultLocale } from "@/i18n/prerender";
import { type Locale, routing } from "@/i18n/routing";
import { getAllSolutionSlugs, getSolution, pick } from "@/lib/constants/solutions-data";
import { buildPageMetadata } from "@/lib/seo/metadata";

type SolutionDetailPageProps = {
  params: Promise<{ lang: string; slug: string }>;
};

/**
 * Params outside generateStaticParams render on demand as a blocking route
 * rather than streaming behind a <Suspense> fallback: a streamed page reaches a
 * reader without JavaScript as its fallback (scripts/verify-landing-ssr.mjs).
 */
export const instant = false;

export function generateStaticParams() {
  return prerenderDefaultLocale(getAllSolutionSlugs(), (slug) => ({ slug }));
}

export async function generateMetadata({ params }: SolutionDetailPageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(routing.locales, lang)) return {};

  const solution = getSolution(slug);
  if (!solution) return {};

  return buildPageMetadata({
    title: `${pick(solution.label, lang)} | Nebutra Solutions`,
    description: pick(solution.tagline, lang),
    path: `/solutions/${solution.slug}`,
    locale: lang as Locale,
  });
}

export default async function SolutionDetailPage({ params }: SolutionDetailPageProps) {
  const { lang, slug } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();
  setRequestLocale(lang as Locale);

  const solution = getSolution(slug);
  if (!solution) notFound();

  return (
    <main
      id="main-content"
      className="relative flex-1 overflow-hidden bg-background selection:bg-primary/30"
    >
      {solution.slug === "china-vc" ? (
        <ChinaVcSolution locale={lang as Locale} />
      ) : solution.slug === "global-vc" ? (
        <GlobalVcSolution locale={lang as Locale} />
      ) : (
        <SolutionPage solution={solution} locale={lang as Locale} />
      )}
      <FinalCTA />
    </main>
  );
}
