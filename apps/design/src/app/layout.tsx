import "./globals.css";
import { brand } from "@nebutra/brand/metadata";
import { fontRegistryClassName } from "@nebutra/fonts/next";
import { CjkFontFace, cjkFontClassName } from "@nebutra/fonts/next/cjk";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
import { PageToc } from "@/components/page-toc";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MobilePageBar, SiteNav, SiteNavSheet } from "@/components/site-nav";
import { THEME_BOOT_SCRIPT } from "@/lib/boot-script";
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <CjkFontFace />
        <Providers>
          <a
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[var(--radius-md)] focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:text-sm"
            href="#content"
          >
            Skip to content
          </a>

          {/* One framed column, the way Geist frames its docs: header, rail,
              article and on-this-page all sit inside the same max-w-wide box
              with a hairline on each side, so every horizontal rule in the
              page runs edge to edge of something. The canvas outside the
              frame is the same canvas; the frame is drawn by the two rails. */}
          <div className="mx-auto min-h-screen max-w-wide border-border xl:border-x">
            <SiteHeader
              menu={<SiteNavSheet sections={sections} />}
              search={<CommandPalette entries={entries} />}
            />
            <MobilePageBar sections={sections} />

            <div className="flex">
              <SiteNav sections={sections} />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-1">
                  <main className="min-w-0 flex-1 px-4 pb-16 md:px-8 lg:px-12" id="content">
                    {children}
                  </main>
                  <PageToc />
                </div>
                <SiteFooter />
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
