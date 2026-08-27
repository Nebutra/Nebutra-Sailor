/**
 * Cookie / analytics consent (visibility G39, G40, G56).
 *
 * Stores user choice in localStorage. Essential cookies only until
 * `analytics` is accepted. Marketing tags (PostHog emit, Vercel Analytics)
 * must call `hasAnalyticsConsent()` before loading.
 */

export const CONSENT_STORAGE_KEY = "nebutra_consent_v1";

export type ConsentChoice = {
  /** ISO timestamp when choice was recorded */
  decidedAt: string;
  analytics: boolean;
  /** Google Consent Mode / TCF placeholder — essential always granted */
  necessary: true;
};

export function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentChoice;
    if (typeof parsed.analytics !== "boolean" || !parsed.decidedAt) return null;
    return { ...parsed, necessary: true };
  } catch {
    return null;
  }
}

export function writeConsent(analytics: boolean): ConsentChoice {
  const choice: ConsentChoice = {
    decidedAt: new Date().toISOString(),
    analytics,
    necessary: true,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(choice));
      window.dispatchEvent(new CustomEvent("nebutra:consent", { detail: choice }));
    } catch {
      // private mode / blocked storage — still return choice for this session
    }
  }
  return choice;
}

export function hasAnalyticsConsent(): boolean {
  // Explicit env kill-switch always wins
  if (typeof process !== "undefined") {
    const envValue = process.env.NEXT_PUBLIC_NEBUTRA_TELEMETRY;
    if (envValue === "0" || envValue === "false") return false;
  }
  const choice = readConsent();
  return choice?.analytics === true;
}

/** Server-safe: never true without browser consent (SSR must not emit tags). */
export function hasAnalyticsConsentServer(): boolean {
  return false;
}
