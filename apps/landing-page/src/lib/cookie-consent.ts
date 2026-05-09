/**
 * Cookie consent storage helpers (client-only).
 *
 * Persists GDPR/CCPA consent state to localStorage under
 * `nebutra-cookie-consent`. Reads are defensive: malformed, expired, or
 * missing payloads return `null` so callers can re-prompt the user.
 *
 * The "necessary" category is always true and cannot be opted out of —
 * `buildConsent` enforces this regardless of input.
 */

export const COOKIE_CONSENT_STORAGE_KEY = "nebutra-cookie-consent";
export const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

export interface CookieConsent {
  /** Always true — strictly necessary cookies cannot be disabled. */
  necessary: true;
  /** User preferences (e.g. language, theme). */
  functional: boolean;
  /** Product analytics (Vercel, Mixpanel, Plausible, …). */
  analytics: boolean;
  /** Marketing / advertising / retargeting. */
  marketing: boolean;
  /** ms since epoch when the user saved consent. */
  timestamp: number;
  /** ms since epoch when this consent record expires (timestamp + 365d). */
  expiresAt: number;
}

export interface CookieConsentInput {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Stamp a consent payload with `timestamp` + `expiresAt`. */
export function buildConsent(input: CookieConsentInput): CookieConsent {
  const now = Date.now();
  return {
    necessary: true,
    functional: Boolean(input.functional),
    analytics: Boolean(input.analytics),
    marketing: Boolean(input.marketing),
    timestamp: now,
    expiresAt: now + CONSENT_TTL_MS,
  };
}

/** Type-guard a parsed JSON payload as a CookieConsent record. */
function isCookieConsent(value: unknown): value is CookieConsent {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.necessary === true &&
    typeof v.functional === "boolean" &&
    typeof v.analytics === "boolean" &&
    typeof v.marketing === "boolean" &&
    typeof v.timestamp === "number" &&
    typeof v.expiresAt === "number"
  );
}

/** Has the consent record passed its expiresAt? */
export function isConsentExpired(consent: CookieConsent, now: number = Date.now()): boolean {
  return now >= consent.expiresAt;
}

/**
 * Read the current consent from localStorage.
 * Returns `null` if missing, malformed, or expired — callers should re-prompt.
 */
export function getCookieConsent(): CookieConsent | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isCookieConsent(parsed)) return null;
    if (isConsentExpired(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist a consent payload to localStorage (overwrites). */
export function setCookieConsent(consent: CookieConsent): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
}

/** Remove any stored consent (used by tests / "withdraw consent" flows). */
export function clearCookieConsent(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
}

export function hasFunctionalConsent(): boolean {
  return getCookieConsent()?.functional === true;
}
export function hasAnalyticsConsent(): boolean {
  return getCookieConsent()?.analytics === true;
}
export function hasMarketingConsent(): boolean {
  return getCookieConsent()?.marketing === true;
}
