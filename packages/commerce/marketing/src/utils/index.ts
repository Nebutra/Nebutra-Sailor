/**
 * @nebutra/marketing - Utility Functions
 *
 * UTM parameter handling, attribution tracking, and analytics utilities
 */

import type { AttributionData, MarketingEvent, UTMParams } from "../types";

// ============================================
// Storage Keys
// ============================================

const STORAGE_PREFIX = "nebutra_mkt_";
const ATTRIBUTION_KEY = `${STORAGE_PREFIX}attribution`;
const _SESSION_KEY = `${STORAGE_PREFIX}session`;
const FIRST_TOUCH_KEY = `${STORAGE_PREFIX}first_touch`;
const EVENTS_KEY = `${STORAGE_PREFIX}events`;

// ============================================
// UTM Parameter Utilities
// ============================================

/**
 * Parse UTM parameters from URL
 */
export function parseUTMParams(url: string | URL = window.location.href): UTMParams {
  const urlObj = typeof url === "string" ? new URL(url) : url;
  const params = urlObj.searchParams;

  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    utm_term: params.get("utm_term") || undefined,
    utm_content: params.get("utm_content") || undefined,
  };
}

/**
 * Check if URL has any UTM parameters
 */
export function hasUTMParams(url: string | URL = window.location.href): boolean {
  const params = parseUTMParams(url);
  return Object.values(params).some((v) => v !== undefined);
}

/**
 * Add UTM parameters to a URL
 */
export function addUTMParams(
  url: string,
  params: UTMParams,
  options?: { overwrite?: boolean },
): string {
  const urlObj = new URL(url);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      if (options?.overwrite || !urlObj.searchParams.has(key)) {
        urlObj.searchParams.set(key, value);
      }
    }
  });

  return urlObj.toString();
}

/**
 * Remove UTM parameters from URL
 */
export function removeUTMParams(url: string): string {
  const urlObj = new URL(url);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

  utmKeys.forEach((key) => {
    urlObj.searchParams.delete(key);
  });

  return urlObj.toString();
}

/**
 * Create Product Hunt UTM parameters
 */
export function createProductHuntUTM(campaign?: string, content?: string): UTMParams {
  return {
    utm_source: "product_hunt",
    utm_medium: "referral",
    utm_campaign: campaign || "launch",
    utm_content: content,
  };
}

// ============================================
// Source Detection
// ============================================

/**
 * Known referrer patterns for source detection
 */
const REFERRER_PATTERNS = {
  "product-hunt": [/producthunt\.com/i],
  google: [/google\./i],
  twitter: [/twitter\.com/i, /t\.co/i, /x\.com/i],
  linkedin: [/linkedin\.com/i],
  facebook: [/facebook\.com/i, /fb\.com/i],
  github: [/github\.com/i],
  reddit: [/reddit\.com/i],
  hackernews: [/news\.ycombinator\.com/i],
  discord: [/discord\.com/i, /discordapp\.com/i],
} as const;

/**
 * Detect source from referrer URL
 */
export function detectSourceFromReferrer(referrer: string): string {
  if (!referrer) return "direct";

  for (const [source, patterns] of Object.entries(REFERRER_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(referrer))) {
      return source;
    }
  }

  // Return the domain as source for unknown referrers
  try {
    const url = new URL(referrer);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/**
 * Detect medium from UTM or referrer
 */
export function detectMedium(utmMedium?: string, referrer?: string): string {
  if (utmMedium) return utmMedium;

  if (!referrer) return "direct";

  const source = detectSourceFromReferrer(referrer);

  // Map known sources to mediums
  const mediumMap: Record<string, string> = {
    google: "organic",
    twitter: "social",
    linkedin: "social",
    facebook: "social",
    reddit: "social",
    discord: "social",
    hackernews: "social",
    github: "referral",
    "product-hunt": "referral",
  };

  return mediumMap[source] || "referral";
}

// ============================================
// Attribution Tracking
// ============================================

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get or create attribution data
 */
export function getAttribution(): AttributionData | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(ATTRIBUTION_KEY);
    if (stored) {
      return JSON.parse(stored) as AttributionData;
    }
  } catch {
    // Storage not available or corrupted
  }

  return null;
}

/**
 * Save attribution data
 */
export function saveAttribution(data: AttributionData): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(data));
  } catch {
    // Storage not available
  }
}

/**
 * Initialize attribution tracking
 * Should be called on page load
 */
export function initAttribution(): AttributionData {
  if (typeof window === "undefined") {
    return {
      source: "unknown",
      medium: "unknown",
      landingPage: "",
      firstTouch: new Date().toISOString(),
      lastTouch: new Date().toISOString(),
      sessionId: generateSessionId(),
    };
  }

  const utmParams = parseUTMParams();
  const referrer = document.referrer;
  const now = new Date().toISOString();

  // Get existing first touch data
  let firstTouchData: Partial<AttributionData> = {};
  try {
    const stored = localStorage.getItem(FIRST_TOUCH_KEY);
    if (stored) {
      firstTouchData = JSON.parse(stored);
    }
  } catch {
    // Storage not available
  }

  // Determine source and medium
  const source = utmParams.utm_source || detectSourceFromReferrer(referrer);
  const medium = detectMedium(utmParams.utm_medium, referrer);

  const attribution: AttributionData = {
    source,
    medium,
    campaign: utmParams.utm_campaign,
    referrer: referrer || undefined,
    landingPage: window.location.href,
    firstTouch: firstTouchData.firstTouch || now,
    lastTouch: now,
    sessionId: generateSessionId(),
    utmParams: hasUTMParams() ? utmParams : undefined,
  };

  // Save first touch if not exists
  if (!firstTouchData.firstTouch) {
    try {
      localStorage.setItem(
        FIRST_TOUCH_KEY,
        JSON.stringify({
          firstTouch: now,
          source,
          medium,
          campaign: utmParams.utm_campaign,
          landingPage: window.location.href,
        }),
      );
    } catch {
      // Storage not available
    }
  }

  // Save current attribution
  saveAttribution(attribution);

  return attribution;
}

/**
 * Get first touch attribution
 */
export function getFirstTouchAttribution(): Partial<AttributionData> | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(FIRST_TOUCH_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Storage not available
  }

  return null;
}

// ============================================
// Event Tracking
// ============================================

/**
 * Track a marketing event
 */
export function trackMarketingEvent(event: MarketingEvent): void {
  if (typeof window === "undefined") return;

  const attribution = getAttribution();
  const eventWithAttribution: MarketingEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
    attribution: event.attribution || attribution || undefined,
  };

  // Store event locally
  try {
    const stored = localStorage.getItem(EVENTS_KEY);
    const events: MarketingEvent[] = stored ? JSON.parse(stored) : [];
    events.push(eventWithAttribution);

    // Keep only last 100 events
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }

    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch {
    // Storage not available
  }

  // Log event for debugging (can be replaced with actual analytics)
  if (process.env.NODE_ENV === "development") {
  }
}

/**
 * Get stored marketing events
 */
export function getMarketingEvents(): MarketingEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(EVENTS_KEY);
    if (stored) {
      return JSON.parse(stored) as MarketingEvent[];
    }
  } catch {
    // Storage not available
  }

  return [];
}

/**
 * Clear stored marketing events
 */
export function clearMarketingEvents(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(EVENTS_KEY);
  } catch {
    // Storage not available
  }
}

// ============================================
// Pre-built Events
// ============================================

/**
 * Track Product Hunt visit
 */
export function trackProductHuntVisit(): void {
  const attribution = getAttribution();
  if (attribution?.source === "product-hunt" || attribution?.source === "producthunt.com") {
    trackMarketingEvent({
      name: "product_hunt_visit",
      properties: {
        campaign: attribution.campaign,
        landingPage: attribution.landingPage,
      },
    });
  }
}

/**
 * Track signup event with attribution
 */
export function trackSignup(properties?: Record<string, unknown>): void {
  trackMarketingEvent({
    name: "signup",
    properties: {
      ...properties,
      ...getAttribution(),
    },
  });
}

/**
 * Track conversion event
 */
export function trackConversion(
  type: "trial" | "paid" | "upgrade" | "custom",
  properties?: Record<string, unknown>,
): void {
  trackMarketingEvent({
    name: `conversion_${type}`,
    properties: {
      ...properties,
      conversionType: type,
    },
  });
}

// ============================================
// URL Utilities
// ============================================

/**
 * Create a tracked link with UTM parameters
 */
export function createTrackedLink(
  url: string,
  source: string,
  medium: string,
  campaign?: string,
  content?: string,
): string {
  return addUTMParams(url, {
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: content,
  });
}

/**
 * Create a Product Hunt post link with UTM
 */
export function createProductHuntLink(slug: string, campaign?: string): string {
  return addUTMParams(`https://www.producthunt.com/posts/${slug}`, {
    utm_source: "website",
    utm_medium: "referral",
    utm_campaign: campaign || "homepage_badge",
  });
}

// ============================================
// Clean URL Utility
// ============================================

/**
 * Clean URL for analytics (remove sensitive params)
 */
export function cleanUrlForAnalytics(url: string): string {
  const urlObj = new URL(url);

  // Remove sensitive parameters
  const sensitiveParams = [
    "token",
    "key",
    "api_key",
    "apiKey",
    "secret",
    "password",
    "auth",
    "session",
    "access_token",
    "refresh_token",
  ];

  sensitiveParams.forEach((param) => {
    urlObj.searchParams.delete(param);
  });

  return urlObj.toString();
}
