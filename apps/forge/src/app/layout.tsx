import "./globals.css";
import { brand } from "@nebutra/brand/metadata";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: {
    default: `${brand.name} Forge — 在线工具站`,
    template: `%s | ${brand.name} Forge`,
  },
  description:
    "编解码、文本、哈希、文档与图片等在线工具。页面上手动完成，或经 API / MCP 接入自动化。",
};

/**
 * Shell contract (landing / product best practice):
 * - Header + footer are full-bleed chrome
 * - <main> is flex-1 only — width/padding owned by each page section
 * - Never put max-w on <main> (double-box with hero/cards)
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen flex-col bg-[var(--neutral-1)] font-sans text-[var(--neutral-12)] antialiased">
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
