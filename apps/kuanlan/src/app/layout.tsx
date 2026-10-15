import { getConfiguredAuthProvider } from "@nebutra/auth";
import { AuthProvider } from "@nebutra/auth/react";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { FontFaces, fontClassName } from "@nebutra/tokens/fonts";
import { fontRegistryClassName } from "@nebutra/tokens/fonts/registry";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import "./globals.css";

/**
 * The Cosmos skin heads every stack with `var(--font-reg-fraunces, "Fraunces")`.
 * Fraunces comes from the shared registry (@nebutra/tokens/fonts/registry):
 * every registry face is declared preload:false, so only the faces this skin's
 * stacks resolve to are downloaded. It used to be a next/font/google call here,
 * which failed the build wherever Google is unreachable.
 */

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
  if (authProvider === "better-auth") {
    authProviderConfig.apiUrl =
      process.env.NEXT_PUBLIC_AUTH_URL?.trim() ||
      process.env.BETTER_AUTH_URL?.trim() ||
      getBrandOrigin("auth");
  }

  return (
    <html lang="zh-CN" data-brand="cosmos" className={`${fontClassName} ${fontRegistryClassName}`}>
      <body className="shell">
        <FontFaces />

        <AuthProvider provider={authProvider} config={authProviderConfig}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
