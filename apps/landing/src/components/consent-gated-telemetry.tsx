"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useEffect, useState } from "react";
import { hasAnalyticsConsent } from "@/lib/consent";

/**
 * Mounts Vercel Analytics / Speed Insights only after analytics consent (G40/G56).
 */
export function ConsentGatedTelemetry() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(hasAnalyticsConsent());
    sync();
    window.addEventListener("nebutra:consent", sync);
    return () => window.removeEventListener("nebutra:consent", sync);
  }, []);

  if (!allowed) return null;
  if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") return null;

  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  );
}
