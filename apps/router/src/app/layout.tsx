import "./globals.css";
// Server layout: root entry is fine (config + createAuth never hit the client graph here).
import { getConfiguredAuthProvider } from "@nebutra/auth";
import { AuthProvider } from "@nebutra/auth/react";
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

/**
 * Shell + @nebutra/auth (default better-auth via Auth Center).
 * Do not import better-auth / clerk SDKs from the app layer.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  const authProvider = getConfiguredAuthProvider();
  const authProviderConfig: Record<string, unknown> = {};
  if (authProvider === "clerk") {
    authProviderConfig.publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  } else if (authProvider === "better-auth") {
    authProviderConfig.apiUrl =
      process.env.NEXT_PUBLIC_AUTH_URL?.trim() ||
      process.env.BETTER_AUTH_URL?.trim() ||
      process.env.NEXT_PUBLIC_AUTH_API_URL?.trim();
  } else if (authProvider === "supabase") {
    authProviderConfig.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    authProviderConfig.supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }

  return (
    <html
      lang="zh-CN"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        <AuthProvider provider={authProvider} config={authProviderConfig}>
          <Suspense fallback={<div className="min-h-screen bg-[var(--neutral-1)]" />}>
            <ConsoleShell>{children}</ConsoleShell>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
