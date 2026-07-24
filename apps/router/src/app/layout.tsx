import "./globals.css";
import { brand } from "@nebutra/brand/metadata";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { ConsoleShell } from "@/components/console-shell";

export const metadata: Metadata = {
  title: {
    default: `${brand.name} Router — API 集市`,
    template: `%s | ${brand.name} Router`,
  },
  description: "全模型 API 集市 · 按量付费 · 管理后台配置 Key/钱包 · 快捷使用试用。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (e.g. MPA) inject attrs on <html>/<body>
    // before React hydrates — not an app bug. See https://react.dev/link/hydration-mismatch
    <html
      lang="zh-CN"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        <Suspense fallback={<div className="min-h-screen bg-[var(--neutral-1)]" />}>
          <ConsoleShell>{children}</ConsoleShell>
        </Suspense>
      </body>
    </html>
  );
}
