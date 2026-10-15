import { FontFaces, fontClassName } from "@nebutra/tokens/fonts";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nebutra Mail Preview",
  description: "Live preview for @nebutra/email transactional templates.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fontClassName}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <FontFaces />

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
