import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { SolutionPage } from "@/components/landing/solutions/SolutionPage";
import { type Locale, routing } from "@/i18n/routing";
import { getAllSolutionSlugs, getSolution, pick } from "@/lib/constants/solutions-data";
import { buildPageMetadata } from "@/lib/seo/metadata";

type SolutionDetailPageProps = {
  params: Promise<{ lang: string; slug: string }>;
};

export function generateStaticParams() {
  return routing.locales.flatMap((lang) => getAllSolutionSlugs().map((slug) => ({ lang, slug })));
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
  setRequestLocale(lang as Locale);

  const solution = getSolution(slug);
  if (!solution) notFound();

  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-hidden bg-background selection:bg-primary/30"
    >
      <Navbar />
      <SolutionPage solution={solution} locale={lang as Locale} />
      <FooterMinimal showFinalCta />
    </main>
  );
}
