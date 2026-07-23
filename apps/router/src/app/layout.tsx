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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <RouterNav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 md:py-12">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
