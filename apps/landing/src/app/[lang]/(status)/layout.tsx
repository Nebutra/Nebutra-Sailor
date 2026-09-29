import type { ReactNode } from "react";
import { env } from "@/lib/env";
import { SiteShell } from "@/site-shell";
import { MarketingClientProviders } from "../(marketing)/marketing-client-providers";

/**
 * The status pages: the site frame without its footer. A trust surface ends on
 * its own content, not on marketing links.
 *
 * This is a layout, not a site-map flag, because status.<domain> serves these
 * pages at "/" through a proxy rewrite: the browser path the frame would read
 * is the home page's, so only the route itself knows it is the status page.
 */
export default async function StatusLayout({
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
      <SiteShell lang={lang} footer="none">
        {children}
      </SiteShell>
    </MarketingClientProviders>
  );
}
