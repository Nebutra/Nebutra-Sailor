import "./globals.css";
import { cjkFontClassName } from "@nebutra/fonts/next/cjk";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { ScrollToTopOnNav } from "@/components/scroll-to-top";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TypeLensMotion } from "@/components/type-lens-motion";
import { catalogFontClassName } from "@/lib/catalog-fonts.generated";

export const metadata: Metadata = {
  title: {
    default: "TypeLens — The Typography Lens",
    template: "%s | TypeLens",
  },
  description:
    "Verified type pairings from real-world works — for human designers and design agents. Free commercial fonts first.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      // catalogFontClassName defines one --tl-face-* variable per typeface the
      // catalog names. next/font reaches a self-hosted face only through its
      // variable, so without this every specimen on a type-specimen site fell
      // through to the page font — 128 faces rendering as one.
      className={`${GeistSans.variable} ${GeistMono.variable} ${cjkFontClassName} ${catalogFontClassName}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        <TypeLensMotion>
          {/* Suspense: useSearchParams requires a boundary during static render */}
          <Suspense fallback={null}>
            <ScrollToTopOnNav />
          </Suspense>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </TypeLensMotion>
      </body>
    </html>
  );
}
