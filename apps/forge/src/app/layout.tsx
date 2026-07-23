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
    default: `${brand.name} Forge — 在线工具站 · Agent 工具基建`,
    template: `%s | ${brand.name} Forge`,
  },
  description:
    "互联网瑞士军刀工具站：字数统计、编码、哈希、JSON… 同一能力同时提供 API / MCP，为人类与 Agent 而生。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <SiteHeader />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-10 md:py-12">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
