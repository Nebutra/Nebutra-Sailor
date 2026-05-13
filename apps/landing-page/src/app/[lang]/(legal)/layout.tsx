import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import type { Locale } from "@/i18n/routing";

interface LegalLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

/**
 * Legal route group — uses the shared marketing <Navbar> for brand consistency
 * and a slim <FooterMinimal variant="legal" /> for reading focus.
 *
 * Trade-off (decided 2026-05-13): unify header for brand continuity + reflow
 * back into the funnel, keep footer slim so the page reads like a document.
 */
export default async function LegalLayout({ children, params }: LegalLayoutProps) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <div className="min-h-screen bg-[var(--neutral-1)] dark:bg-black">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">{children}</main>
      <FooterMinimal variant="legal" />
    </div>
  );
}
