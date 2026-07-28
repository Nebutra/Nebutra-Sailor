import "./globals.css";
import { brand } from "@nebutra/brand/metadata";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: `${brand.name} Admin`,
    template: `%s · ${brand.name} Admin`,
  },
  description: `Internal control plane for the ${brand.name} ecosystem.`,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-neutral-1 font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
