"use client";

import dynamic from "next/dynamic";
import { PRESET_PREVIEW } from "@/lib/preset-preview-flag";

/**
 * Everything the root layout mounts that nobody needs for the first paint: the
 * toast outlet, the consent card, the consent-gated telemetry and — on the
 * preview site only — the Sailor Studio preset bar. Each one renders nothing on
 * the server and decides what to show from browser state (localStorage, a
 * cookie, a later toast() call), so loading them after hydration changes no
 * pixel of the first frame. Imported statically, their code (sonner, the
 * consent card, the preset parser) sat in every page's first load.
 *
 * `PRESET_PREVIEW` is a build-time constant, so on every build but the preview
 * site the preset bar's import is dead code and its chunk is never emitted.
 */
const Toaster = dynamic(() => import("./deferred/toaster").then((m) => m.Toaster), {
  ssr: false,
});
const CookieConsentBanner = dynamic(
  () => import("./cookie-consent-banner").then((m) => m.CookieConsentBanner),
  { ssr: false },
);
const ConsentGatedTelemetry = dynamic(
  () => import("./consent-gated-telemetry").then((m) => m.ConsentGatedTelemetry),
  { ssr: false },
);
const PresetPreview = PRESET_PREVIEW
  ? dynamic(() => import("./preset-preview").then((m) => m.PresetPreview), { ssr: false })
  : null;

/** Inside the intl + UI-label providers: the consent card and toasts read both. */
export function DeferredChrome() {
  return (
    <>
      {/* Global toast outlet — landing surfaces (e.g. changelog) call `toast.*` */}
      <Toaster />
      <CookieConsentBanner />
      {PresetPreview ? <PresetPreview /> : null}
    </>
  );
}

/** Vercel Analytics / Speed Insights, mounted only after consent. */
export function DeferredTelemetry() {
  return <ConsentGatedTelemetry />;
}
