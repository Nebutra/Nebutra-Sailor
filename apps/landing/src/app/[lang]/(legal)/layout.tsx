import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/routing";
import { SiteShell } from "@/site-shell";

interface LegalLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

/**
 * Legal route group — the shared site navigation for brand consistency and
 * the slim legal footer for reading focus.
 *
 * Trade-off (decided 2026-05-13): unify header for brand continuity + reflow
 * back into the funnel, keep footer slim so the page reads like a document.
 */
export default async function LegalLayout({ children, params }: LegalLayoutProps) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <SiteShell footer="legal">
      {/* pt-24 clears the fixed Navbar (h-16) plus a reading-lede gap.
          flex-1 turns this into a sticky-footer layout — on short legal
          pages the footer hugs the viewport bottom instead of leaving a
          dead band of whitespace beneath it. */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {children}
      </main>
    </SiteShell>
  );
}
