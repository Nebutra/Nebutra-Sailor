import { getConfiguredAuthProvider } from "@nebutra/auth";
import { AuthProvider } from "@nebutra/auth/react";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { cjkFontClassName } from "@nebutra/fonts/next/cjk";
import { Fraunces } from "next/font/google";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import "./globals.css";

/**
 * The Cosmos skin emits every font stack headed by `var(--font-reg-fraunces)`,
 * because next/font registers a face under a hashed family name reachable only
 * through its variable — a bare `"Fraunces"` in the stack renders nothing.
 * The variable name is FONT_REGISTRY["fraunces"] in @nebutra/fonts and must
 * stay in step with it.
 *
 * Declared here rather than through `@nebutra/fonts/next` so this app pulls one
 * Google face instead of the registry's seventeen. The CJK face comes from the
 * self-hosted `./next/cjk` entry; the skin already places it ahead of the
 * generic families in each stack, which is what keeps Chinese off the OS font.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-reg-fraunces",
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
      getBrandOrigin("auth");
  }

  return (
    <html lang="zh-CN" data-brand="cosmos" className={`${fraunces.variable} ${cjkFontClassName}`}>
      <body className="shell">
        <AuthProvider provider={authProvider} config={authProviderConfig}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
