import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { SolutionsIndex } from "@/components/landing/solutions/SolutionsIndex";
import { type Locale, routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

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
  const isZh = lang === "zh";
  return buildPageMetadata({
    title: isZh ? "解决方案 | Nebutra" : "Solutions | Nebutra",
    description: isZh
      ? "为出海创业者准备的场景手册——出海、增长、架构治理、AI 与融资的最佳实践。"
      : "Scenario playbooks for outbound founders — go global, growth, architecture, AI and fundraising best practices.",
    path: "/solutions",
    locale: lang as Locale,
  });
}

export default async function SolutionsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-hidden bg-background selection:bg-primary/30"
    >
      <Navbar />
      <SolutionsIndex locale={lang as Locale} />
      <FooterMinimal showFinalCta />
    </main>
  );
}
