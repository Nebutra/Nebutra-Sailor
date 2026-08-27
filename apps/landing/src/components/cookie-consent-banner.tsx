"use client";

import { brand } from "@nebutra/brand/metadata";
import { useEffect, useState } from "react";
import { hasAnalyticsConsent, readConsent, writeConsent } from "@/lib/consent";

/**
 * Minimal first-party consent UI (G39). Blocks non-essential tags until choice.
 * Not a full TCF CMP — G41 documents Consent Mode integration path separately.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsent() === null);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 md:p-5"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1">
          <p id="cookie-consent-title" className="text-sm font-semibold text-foreground">
            Cookies & analytics
          </p>
          <p id="cookie-consent-desc" className="text-sm text-muted-foreground">
            We use essential cookies to run the site. Optional analytics help us improve{" "}
            {brand.name}. See our{" "}
            <a href="/cookies" className="underline underline-offset-2 hover:text-foreground">
              Cookie Policy
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            onClick={() => {
              writeConsent(false);
              setVisible(false);
            }}
          >
            Essential only
          </button>
          <button
            type="button"
            className="min-h-11 rounded-[var(--radius-md)] bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
            onClick={() => {
              writeConsent(true);
              setVisible(false);
              // Soft reload so gated Analytics components remount with consent
              if (!hasAnalyticsConsent()) return;
              window.location.reload();
            }}
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}
