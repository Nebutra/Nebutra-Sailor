/**
 * Consent Service
 *
 * Handles user consent for legal documents and cookie preferences.
 * Provides client-side utilities for consent management.
 */

import { cookieConfig } from "../documents/config";
import type {
  ConsentRequest,
  ConsentStatus,
  CookieConsentRequest,
  CookiePreferences,
} from "../types";

// ============================================
// Constants
// ============================================

const COOKIE_CONSENT_KEY = "nebutra_cookie_consent";
const DOCUMENT_CONSENT_KEY = "nebutra_document_consent";
const VISITOR_ID_KEY = "nebutra_visitor_id";

// ============================================
// Visitor ID Management
// ============================================

/**
 * Generate a unique visitor ID
 */
export function generateVisitorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `v_${timestamp}_${random}`;
}

/**
 * Get or create visitor ID from localStorage
 */
export function getVisitorId(): string {
  if (typeof window === "undefined") {
    return generateVisitorId();
  }

  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = generateVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

// ============================================
// Cookie Consent (Client-Side)
// ============================================

/**
 * Default cookie preferences (all optional disabled)
 */
export const defaultCookiePreferences: CookiePreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
  thirdParty: false,
};

/**
 * Get current cookie consent from localStorage
 */
export function getCookieConsent(): CookiePreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);
    return {
      necessary: true, // Always true
      functional: parsed.functional ?? false,
      analytics: parsed.analytics ?? false,
      marketing: parsed.marketing ?? false,
      thirdParty: parsed.thirdParty ?? false,
    };
  } catch {
    return null;
  }
}

/**
 * Save cookie consent to localStorage
 */
export function saveCookieConsent(preferences: Omit<CookiePreferences, "necessary">): void {
  if (typeof window === "undefined") {
    return;
  }

  const fullPreferences: CookiePreferences = {
    necessary: true,
    ...preferences,
  };

  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(fullPreferences));

  // Dispatch custom event for other scripts to react
  window.dispatchEvent(
    new CustomEvent("cookieConsentUpdated", {
      detail: fullPreferences,
    }),
  );
}

/**
 * Accept all cookies
 */
export function acceptAllCookies(): void {
  saveCookieConsent({
    functional: true,
    analytics: true,
    marketing: true,
    thirdParty: true,
  });
}

/**
 * Reject all optional cookies (only necessary)
 */
export function rejectAllCookies(): void {
  saveCookieConsent({
    functional: false,
    analytics: false,
    marketing: false,
    thirdParty: false,
  });
}

/**
 * Check if cookie consent has been given
 */
export function hasCookieConsent(): boolean {
  return getCookieConsent() !== null;
}

/**
 * Check if a specific cookie category is allowed
 */
export function isCookieCategoryAllowed(category: keyof CookiePreferences): boolean {
  if (category === "necessary") {
    return true;
  }

  const consent = getCookieConsent();
  if (!consent) {
    return false;
  }

  return consent[category] ?? false;
}

/**
 * Calculate cookie consent expiry date
 */
export function getCookieConsentExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + cookieConfig.consentDuration);
  return expiry;
}

// ============================================
// Document Consent (Client-Side Cache)
// ============================================

interface DocumentConsentCache {
  [documentSlug: string]: {
    version: string;
    consentedAt: string;
  };
}

/**
 * Get cached document consents from localStorage
 */
export function getDocumentConsents(): DocumentConsentCache {
  if (typeof window === "undefined") {
    return {};
  }

  const stored = localStorage.getItem(DOCUMENT_CONSENT_KEY);
  if (!stored) {
    return {};
  }

  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

/**
 * Cache document consent locally (for quick checks before API call)
 */
export function cacheDocumentConsent(documentSlug: string, version: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const consents = getDocumentConsents();
  consents[documentSlug] = {
    version,
    consentedAt: new Date().toISOString(),
  };
  localStorage.setItem(DOCUMENT_CONSENT_KEY, JSON.stringify(consents));
}

/**
 * Check if document consent is cached locally
 */
export function hasDocumentConsentCached(documentSlug: string, version?: string): boolean {
  const consents = getDocumentConsents();
  const consent = consents[documentSlug];

  if (!consent) {
    return false;
  }

  if (version && consent.version !== version) {
    return false;
  }

  return true;
}

// ============================================
// API Client Functions
// ============================================

export interface ConsentApiConfig {
  baseUrl: string;
  getHeaders?: () => Promise<Record<string, string>>;
}

let apiConfig: ConsentApiConfig = {
  baseUrl: "/api/v1/legal",
};

/**
 * Configure the consent API client
 */
export function configureConsentApi(config: ConsentApiConfig): void {
  apiConfig = { ...apiConfig, ...config };
}

/**
 * Record user consent for a document via API
 */
export async function recordDocumentConsent(request: ConsentRequest): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiConfig.getHeaders) {
    Object.assign(headers, await apiConfig.getHeaders());
  }

  const response = await fetch(`${apiConfig.baseUrl}/consent`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...request,
      visitorId: getVisitorId(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to record consent: ${response.statusText}`);
  }

  // Cache locally
  cacheDocumentConsent(request.documentSlug, request.documentVersion ?? "latest");
}

/**
 * Get consent status for a document via API
 */
export async function getConsentStatus(documentSlug: string): Promise<ConsentStatus> {
  const headers: Record<string, string> = {};

  if (apiConfig.getHeaders) {
    Object.assign(headers, await apiConfig.getHeaders());
  }

  const visitorId = getVisitorId();
  const response = await fetch(
    `${apiConfig.baseUrl}/consent/status?documentSlug=${documentSlug}&visitorId=${visitorId}`,
    { headers },
  );

  if (!response.ok) {
    throw new Error(`Failed to get consent status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Record cookie consent via API
 */
export async function recordCookieConsent(
  preferences: Omit<CookiePreferences, "necessary">,
): Promise<void> {
  // Save locally first
  saveCookieConsent(preferences);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiConfig.getHeaders) {
    Object.assign(headers, await apiConfig.getHeaders());
  }

  const request: CookieConsentRequest = {
    visitorId: getVisitorId(),
    preferences,
  };

  const response = await fetch(`${apiConfig.baseUrl}/cookie-consent`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
  }
}

// ============================================
// GTM/Analytics Integration
// ============================================

/**
 * Update Google Tag Manager consent mode
 */
export function updateGTMConsent(preferences: CookiePreferences): void {
  if (typeof window === "undefined" || !(window as unknown as { gtag?: unknown }).gtag) {
    return;
  }

  const gtag = (window as unknown as { gtag: (...args: unknown[]) => void }).gtag;

  gtag("consent", "update", {
    ad_storage: preferences.marketing ? "granted" : "denied",
    ad_user_data: preferences.marketing ? "granted" : "denied",
    ad_personalization: preferences.marketing ? "granted" : "denied",
    analytics_storage: preferences.analytics ? "granted" : "denied",
    functionality_storage: preferences.functional ? "granted" : "denied",
    personalization_storage: preferences.functional ? "granted" : "denied",
  });
}

/**
 * Initialize consent mode with defaults (denied)
 */
export function initializeGTMConsentMode(): void {
  if (typeof window === "undefined") {
    return;
  }

  // Initialize dataLayer if not present
  (window as unknown as { dataLayer?: unknown[] }).dataLayer =
    (window as unknown as { dataLayer?: unknown[] }).dataLayer || [];

  const gtag = (...args: unknown[]) => {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push(args);
  };

  // Set default consent to denied
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    wait_for_update: 500,
  });

  // If consent already given, update immediately
  const consent = getCookieConsent();
  if (consent) {
    updateGTMConsent(consent);
  }
}
