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
    <div className="flex min-h-screen flex-col bg-[var(--neutral-1)] dark:bg-black">
      <Navbar />
      {/* pt-24 clears the fixed Navbar (h-16) plus a reading-lede gap.
          flex-1 turns this into a sticky-footer layout — on short legal
          pages the footer hugs the viewport bottom instead of leaving a
          dead band of whitespace beneath it. */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {children}
      </main>
      <FooterMinimal variant="legal" />
    </div>
  );
}
