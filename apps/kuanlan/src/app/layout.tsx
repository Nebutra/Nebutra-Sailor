import { getConfiguredAuthProvider } from "@nebutra/auth";
import { AuthProvider } from "@nebutra/auth/react";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${BRAND.name} ${BRAND.nameCn}`,
  description: BRAND.slogan,
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const authProvider = getConfiguredAuthProvider();
  const authProviderConfig: Record<string, unknown> = {};
  if (authProvider === "clerk") {
    authProviderConfig.publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  } else if (authProvider === "better-auth") {
    authProviderConfig.apiUrl =
      process.env.NEXT_PUBLIC_AUTH_URL?.trim() ||
      process.env.BETTER_AUTH_URL?.trim() ||
      "https://auth.nebutra.com";
  }

  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className="shell">
        <AuthProvider provider={authProvider} config={authProviderConfig}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
