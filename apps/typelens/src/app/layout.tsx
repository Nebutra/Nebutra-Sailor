import "./globals.css";
import { cjkFontClassName } from "@nebutra/fonts/next/cjk";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TypeLensMotion } from "@/components/type-lens-motion";

export const metadata: Metadata = {
  title: {
    default: "Type Lens — The Typography Lens",
    template: "%s | Type Lens",
  },
  description:
    "Verified type pairings from real-world works — for human designers and design agents. Free commercial fonts first.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${cjkFontClassName}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        <TypeLensMotion>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </TypeLensMotion>
      </body>
    </html>
  );
}
