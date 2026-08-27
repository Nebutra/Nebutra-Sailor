"use client";

import type { ReactNode } from "react";
import { GoogleOneTap } from "@/components/auth/google-one-tap";
import { MarketingMotionProvider } from "@/components/landing/AnimateIn";
import { usePathname } from "@/i18n/navigation";
import { shouldMountMarketingGoogleOneTap } from "./marketing-google-one-tap-policy";

interface MarketingClientProvidersProps {
  appUrl: string;
  authProvider: string;
  children: ReactNode;
  clerkPublishableKey?: string;
  googleClientId?: string;
  googleOneTapEnabled: boolean;
}

export function MarketingClientProviders({
  appUrl,
  authProvider,
  children,
  clerkPublishableKey,
  googleClientId,
  googleOneTapEnabled,
}: MarketingClientProvidersProps) {
  const pathname = usePathname();
  const shouldMountOneTap = shouldMountMarketingGoogleOneTap(pathname, googleOneTapEnabled);

  return (
    <MarketingMotionProvider>
      {children}
      <GoogleOneTap
        appUrl={appUrl}
        authProvider={authProvider}
        clerkPublishableKey={clerkPublishableKey}
        clientId={googleClientId}
        enabled={shouldMountOneTap}
      />
    </MarketingMotionProvider>
  );
}
