import "./globals.css";
import { brand } from "@nebutra/brand/metadata";
import { fontRegistryClassName } from "@nebutra/fonts/next";
import { cjkFontClassName } from "@nebutra/fonts/next/cjk";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
import { HeaderLanguageSwitcher } from "@/components/header-language-switcher";
import { PageToc } from "@/components/page-toc";
import { SiteNav, SiteNavCompact } from "@/components/site-nav";
import { commandEntries, navSections } from "@/lib/nav";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: `The ${brand.name} design system as a product surface — live tokens, live components, generated from the source.`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const sections = navSections();
  const entries = commandEntries();

  return (
    <html
      // fontRegistryClassName defines the --font-* variables skins.css names.
      // This app IS the language switcher; without it every non-default language
      // demonstrates itself in the system font.
      className={`${GeistSans.variable} ${GeistMono.variable} ${cjkFontClassName} ${fontRegistryClassName}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {/* The header carries identity and the language switch only. Navigation
            moved into the sidebar, where the whole inventory is visible at once
            rather than five representatives of it. */}
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-6 py-3 md:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link className="font-semibold text-[15px] tracking-tight" href="/">
                {SITE_NAME}
              </Link>
              <div className="flex items-center gap-3">
                <CommandPalette entries={entries} />
                <HeaderLanguageSwitcher />
              </div>
            </div>
            <SiteNavCompact sections={sections} />
          </div>
        </header>

        {/* Three rails at xl: inventory, article, on-this-page. The right one
            removes itself when a page has fewer than two sections, so short
            pages keep the full measure instead of reserving a column for a
            list of one. */}
        <div className="mx-auto grid max-w-[1400px] gap-8 px-6 pb-16 md:px-10 lg:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[224px_minmax(0,1fr)_180px]">
          <SiteNav sections={sections} />
          <main className="min-w-0 py-8">{children}</main>
          <PageToc />
        </div>
      </body>
    </html>
  );
}
