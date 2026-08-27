"use client";

import { OnboardingProvider } from "@nebutra/onboarding";
import type { ReactNode } from "react";

/**
 * Mount-point for the global product-tour controller. Wrap the authenticated
 * shell so every dashboard surface can call `useTour()`.
 *
 * Styles are pulled in via `apps/web/src/app/globals.css`:
 *   @import "@nebutra/onboarding/styles.css";
 */
export function OnboardingMount({ children }: { children: ReactNode }) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}
