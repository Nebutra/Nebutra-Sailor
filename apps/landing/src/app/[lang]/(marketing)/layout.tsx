import type { ReactNode } from "react";
import { env } from "@/lib/env";
import { SiteShell } from "@/site-shell";
import { MarketingClientProviders } from "./marketing-client-providers";

/**
 * Marketing route group: the client providers (Google One Tap) and the site
 * frame. Children remain RSC — Next.js renders them server-side and threads
 * them through the client wrapper. There is no motion provider: AnimateIn
 * loads GSAP itself, so pages that never animate do not download it.
 *
 * `SiteShell` draws the frame (the rail on the Nebutra site, the top nav in the
 * template), so pages render content only.
 */
export default async function MarketingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <MarketingClientProviders
      appUrl={env.NEXT_PUBLIC_APP_URL}
      authProvider={env.NEXT_PUBLIC_AUTH_PROVIDER}
      googleClientId={env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
      googleOneTapEnabled={env.NEXT_PUBLIC_ENABLE_GOOGLE_ONE_TAP !== "false"}
    >
      <SiteShell lang={lang}>{children}</SiteShell>
    </MarketingClientProviders>
  );
}
