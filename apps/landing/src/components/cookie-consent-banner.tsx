"use client";

import { brand } from "@nebutra/brand/metadata";
import { ConsentCard } from "@nebutra/ui/patterns";
import { useEffect, useState } from "react";
import { hasAnalyticsConsent, readConsent, writeConsent } from "@/lib/consent";

/**
 * Minimal first-party consent UI (G39). Blocks non-essential tags until choice.
 * Not a full TCF CMP — G41 documents Consent Mode integration path separately.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // A framed document (Studio's catalog frame) never asks: the page that
    // embeds it already did, and the choice is shared by origin.
    if (window.self !== window.top) return;
    setVisible(readConsent() === null);
  }, []);

  if (!visible) return null;

  // A corner card, not a bar across the page (ConsentCard): the visitor can
  // still read what they came for while the question waits.
  return (
    <ConsentCard
      decline={{
        label: "Essential only",
        onClick: () => {
          writeConsent(false);
          setVisible(false);
        },
      }}
      accept={{
        label: "Accept analytics",
        onClick: () => {
          writeConsent(true);
          setVisible(false);
          // Soft reload so gated Analytics components remount with consent
          if (!hasAnalyticsConsent()) return;
          window.location.reload();
        },
      }}
    >
      Essential cookies run the site; optional analytics help us improve {brand.name}.{" "}
      <a href="/cookies">Cookie policy</a>
    </ConsentCard>
  );
}
