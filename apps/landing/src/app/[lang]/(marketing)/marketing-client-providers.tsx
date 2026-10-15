"use client";

import type { ReactNode } from "react";
import { GoogleOneTap } from "@/components/auth/google-one-tap";
import { usePathname } from "@/i18n/navigation";
import { shouldMountMarketingGoogleOneTap } from "./marketing-google-one-tap-policy";

interface MarketingClientProvidersProps {
  appUrl: string;
  authProvider: string;
  children: ReactNode;
  googleClientId?: string;
  googleOneTapEnabled: boolean;
}

export function MarketingClientProviders({
  appUrl,
  authProvider,
  children,
  googleClientId,
  googleOneTapEnabled,
}: MarketingClientProvidersProps) {
  const pathname = usePathname();
  const shouldMountOneTap = shouldMountMarketingGoogleOneTap(pathname, googleOneTapEnabled);

  // No motion provider here: AnimateIn loads the motion engine on first use,
  // and importing it from this layout put the engine (~50 KB gzip) into
  // the first load of every marketing page, including pages that never move.
  return (
    <>
      {children}
      <GoogleOneTap
        appUrl={appUrl}
        authProvider={authProvider}
        clientId={googleClientId}
        enabled={shouldMountOneTap}
      />
    </>
  );
}
