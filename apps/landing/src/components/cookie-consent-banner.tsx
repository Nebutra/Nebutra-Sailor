"use client";

import { brand } from "@nebutra/brand/metadata";
import { ConsentCard } from "@nebutra/ui/patterns";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "@/i18n/navigation";
import { hasAnalyticsConsent, readConsent, writeConsent } from "@/lib/consent";
import { pageAt } from "@/site-map";

/**
 * Minimal first-party consent UI (G39). Blocks non-essential tags until choice.
 * Not a full TCF CMP — G41 documents Consent Mode integration path separately.
 */
/**
 * A full-viewport tool (Sailor Studio) has no free corner: a floating card
 * would sit on its canvas. Such a page offers an element with this id, and the
 * question is asked there, in the flow of its panel, instead. The page marks
 * it `data-ready` once hydrated: a portal into a slot React has not hydrated
 * yet would be a hydration mismatch.
 */
export const CONSENT_SLOT_ID = "consent-slot";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  // A tool page asks in its slot or not at all — never over its canvas.
  const tool = pageAt(usePathname() ?? "")?.chrome === "tool";

  useEffect(() => {
    // A framed document (Studio's catalog frame) never asks: the page that
    // embeds it already did, and the choice is shared by origin.
    if (window.self !== window.top) return;
    setVisible(readConsent() === null);
  }, []);

  // The slot comes and goes with client navigation; look for it on each change.
  useEffect(() => {
    if (!visible) return;
    const find = () =>
      setSlot(document.querySelector<HTMLElement>(`#${CONSENT_SLOT_ID}[data-ready]`));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-ready"],
    });
    return () => observer.disconnect();
  }, [visible]);

  if (!visible || (tool && !slot)) return null;

  // A corner card, not a bar across the page (ConsentCard): the visitor can
  // still read what they came for while the question waits.
  const card = (
    <ConsentCard
      className={slot ? "static w-full max-w-none shadow-none backdrop-blur-none" : undefined}
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
  return slot ? createPortal(card, slot) : card;
}
