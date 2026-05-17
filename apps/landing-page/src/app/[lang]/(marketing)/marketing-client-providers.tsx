"use client";

import { domAnimation, LazyMotion } from "framer-motion";
import type { ReactNode } from "react";
import { GoogleOneTap } from "@/components/auth/google-one-tap";

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
  return (
    <LazyMotion features={domAnimation}>
      {children}
      <GoogleOneTap
        appUrl={appUrl}
        authProvider={authProvider}
        clerkPublishableKey={clerkPublishableKey}
        clientId={googleClientId}
        enabled={googleOneTapEnabled}
      />
    </LazyMotion>
  );
}
