import type { ReactNode } from "react";
import { env } from "@/lib/env";
import { MarketingClientProviders } from "./marketing-client-providers";

/**
 * Marketing route group provides a single LazyMotion provider for the entire
 * subtree. Children remain RSC — Next.js renders them server-side and threads
 * them through this client wrapper. AnimateIn uses the shared Motion element
 * facade and relies on this provider for feature registration, so framer's `domAnimation`
 * features module is loaded exactly once per session.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <MarketingClientProviders
      appUrl={env.NEXT_PUBLIC_APP_URL}
      authProvider={env.NEXT_PUBLIC_AUTH_PROVIDER}
      clerkPublishableKey={env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      googleClientId={env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
      googleOneTapEnabled={env.NEXT_PUBLIC_ENABLE_GOOGLE_ONE_TAP !== "false"}
    >
      {children}
    </MarketingClientProviders>
  );
}
