"use client";

import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import type { PageViewInput, PrivacyOptions, TrackConversionInput, TrackEventInput } from "./types";

// ============================================================================
// Types
// ============================================================================

interface AnalyticsContextValue {
  /** Track a custom event */
  track: (name: string, properties?: Record<string, unknown>) => void;
  /** Track a page view */
  trackPageView: (input?: PageViewInput) => void;
  /** Track a conversion */
  trackConversion: (input: TrackConversionInput) => void;
  /** Identify a user */
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  /** Reset user identity */
  reset: () => void;
  /** Check if consent is given */
  hasConsent: boolean;
  /** Set consent */
  setConsent: (consent: boolean) => void;
}

interface AnalyticsProviderProps {
  children: ReactNode;
  /** Tenant ID for multi-tenant */
  tenantId?: string;
  /** Privacy options */
  options?: PrivacyOptions;
  /** Enable debug mode */
  debug?: boolean;
}

// ============================================================================
// Context
// ============================================================================

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function AnalyticsProvider({
  children,
  tenantId,
  options = {},
  debug = false,
}: AnalyticsProviderProps) {
  const [hasConsent, setHasConsentState] = React.useState(() => {
    if (typeof window === "undefined") return false;
    if (!options.cookieConsent) return true;

    const stored = localStorage.getItem("analytics_consent");
    return stored === "true";
  });

  const userIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Check Do Not Track
  const doNotTrack =
    options.respectDoNotTrack && typeof navigator !== "undefined" && navigator.doNotTrack === "1";

  const canTrack = hasConsent && !doNotTrack;

  // ==========================================================================
  // Tracking Functions
  // ==========================================================================

  const sendEvent = useCallback(
    async (eventType: string, data: Record<string, unknown>) => {
      if (!canTrack) {
        if (debug) console.warn("[Analytics] Tracking disabled, skipping:", eventType);
        return;
      }

      if (!sessionIdRef.current) {
        sessionIdRef.current = generateSessionId();
      }

      const payload = {
        type: eventType,
        tenantId,
        userId: userIdRef.current,
        sessionId: sessionIdRef.current,
        timestamp: new Date().toISOString(),
        url: typeof window !== "undefined" ? window.location.href : undefined,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        ...data,
      };

      if (debug) {
        console.warn("[Analytics] Event:", payload);
      }

      // Send to analytics endpoint
      try {
        await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        if (debug) console.error("[Analytics] Failed to send event:", error);
      }
    },
    [canTrack, tenantId, debug],
  );

  const track = useCallback(
    (name: string, properties?: Record<string, unknown>) => {
      sendEvent("track", { name, properties });
    },
    [sendEvent],
  );

  const trackPageView = useCallback(
    (input?: PageViewInput) => {
      sendEvent("pageview", {
        url: input?.url || (typeof window !== "undefined" ? window.location.href : ""),
        title: input?.title || (typeof document !== "undefined" ? document.title : ""),
        referrer: input?.referrer || (typeof document !== "undefined" ? document.referrer : ""),
      });
    },
    [sendEvent],
  );

  const trackConversion = useCallback(
    (input: TrackConversionInput) => {
      sendEvent("conversion", {
        eventName: input.eventName,
        value: input.value,
        currency: input.currency,
        metadata: input.metadata,
      });
    },
    [sendEvent],
  );

  const identify = useCallback(
    (userId: string, traits?: Record<string, unknown>) => {
      userIdRef.current = userId;
      sendEvent("identify", { userId, traits });

      // Store in cookie/localStorage for persistence
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("analytics_user_id", userId);
      }
    },
    [sendEvent],
  );

  const reset = useCallback(() => {
    userIdRef.current = null;
    sessionIdRef.current = generateSessionId();

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("analytics_user_id");
    }
  }, []);

  const setConsent = useCallback((consent: boolean) => {
    setHasConsentState(consent);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("analytics_consent", consent.toString());
    }
  }, []);

  // ==========================================================================
  // Auto-tracking
  // ==========================================================================

  // Track initial page view
  useEffect(() => {
    if (canTrack) {
      trackPageView();
    }
  }, [canTrack, trackPageView]);

  // Restore user ID from storage
  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      const storedUserId = localStorage.getItem("analytics_user_id");
      if (storedUserId) {
        userIdRef.current = storedUserId;
      }
    }
  }, []);

  // Track page views on route change (for SPAs)
  useEffect(() => {
    if (typeof window === "undefined" || !canTrack) return;

    const handleRouteChange = () => {
      trackPageView();
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, [canTrack, trackPageView]);

  // ==========================================================================
  // Context Value
  // ==========================================================================

  const value: AnalyticsContextValue = {
    track,
    trackPageView,
    trackConversion,
    identify,
    reset,
    hasConsent,
    setConsent,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
      {options.cookieBanner && !hasConsent && (
        <CookieBanner onAccept={() => setConsent(true)} onDecline={() => setConsent(false)} />
      )}
    </AnalyticsContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
}

/**
 * Hook to track page views automatically
 */
export function usePageView(url?: string, title?: string) {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView({ url, title });
  }, [url, title, trackPageView]);
}

/**
 * Hook to track an event
 */
export function useTrackEvent() {
  const { track } = useAnalytics();
  return track;
}

/**
 * Hook to track conversions
 */
export function useTrackConversion() {
  const { trackConversion } = useAnalytics();
  return trackConversion;
}

// ============================================================================
// Components
// ============================================================================

interface CookieBannerProps {
  onAccept: () => void;
  onDecline: () => void;
}

function CookieBanner({ onAccept, onDecline }: CookieBannerProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "1rem",
        backgroundColor: "#1f2937",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <p style={{ margin: 0 }}>
        We use cookies to improve your experience. By using our site, you agree to our use of
        cookies.
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={onDecline}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "transparent",
            color: "white",
            border: "1px solid white",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Decline
        </button>
        <button
          onClick={onAccept}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Client-side tracking functions (for non-React usage)
// ============================================================================

export function trackEvent(input: TrackEventInput): void {
  if (typeof window === "undefined") return;

  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "track",
      name: input.name,
      properties: input.properties,
      tenantId: input.tenantId,
      userId: input.userId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    }),
  }).catch(console.error);
}

export function trackConversion(input: TrackConversionInput): void {
  if (typeof window === "undefined") return;

  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "conversion",
      eventName: input.eventName,
      value: input.value,
      currency: input.currency,
      metadata: input.metadata,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    }),
  }).catch(console.error);
}
