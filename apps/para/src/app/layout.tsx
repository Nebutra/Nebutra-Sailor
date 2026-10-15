import { FontFaces, fontClassName } from "@nebutra/tokens/fonts";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "PARA", template: "%s · PARA" },
  description: "A quiet workspace for making things.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className={`${fontClassName}`} suppressHydrationWarning>
      <body className="h-full bg-background font-sans text-foreground antialiased">
        <FontFaces />

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
