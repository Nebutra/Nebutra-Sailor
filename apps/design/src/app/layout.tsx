import "./globals.css";
import { brand } from "@nebutra/brand/metadata";
import { cjkFontClassName } from "@nebutra/fonts/next/cjk";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: `The ${brand.name} design system as a product surface — live tokens, live components, generated from the source.`,
};

const NAV = [
  { href: "/tokens", label: "Tokens" },
  { href: "/components", label: "Components" },
  { href: "/tokens/layers", label: "Layers" },
  { href: "/tokens/traps", label: "Traps" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${cjkFontClassName}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <header className="bg-background/85 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-baseline gap-8 px-6 py-5 md:px-10">
            <Link className="font-semibold text-[15px] tracking-tight" href="/">
              {SITE_NAME}
            </Link>
            <nav className="flex items-baseline gap-5 text-[13px] text-muted-foreground">
              {NAV.map((item) => (
                <Link
                  className="transition-colors hover:text-foreground"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-6 py-10 md:px-10">{children}</main>
      </body>
    </html>
  );
}
