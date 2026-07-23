import "./globals.css";
import { brand } from "@nebutra/brand/metadata";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RouterNav } from "@/components/router-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: {
    default: `${brand.name} Router — 模型聚合中转`,
    template: `%s | ${brand.name} Router`,
  },
  description: "302 风格旅程：充值 → API Key → base_url 调用。Agent 可依赖的 Model Fabric。",
};

/** Full-bleed chrome; page sections own max-width. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen flex-col bg-[var(--neutral-1)] font-sans text-[var(--neutral-12)] antialiased">
        <RouterNav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
