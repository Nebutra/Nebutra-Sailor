"use client";

/**
 * @nebutra/marketing - React Hooks
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { AttributionData } from "../types";
import {
  getAttribution,
  initAttribution,
  trackMarketingEvent,
  trackProductHuntVisit,
} from "../utils";

// ============================================
// Attribution Hook
// ============================================

/**
 * Hook to initialize and access attribution data
 */
export function useAttribution() {
  const [attribution, setAttribution] = useState<AttributionData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize attribution on mount
    const data = initAttribution();
    setAttribution(data);
    setIsInitialized(true);

    // Track Product Hunt visits automatically
    trackProductHuntVisit();
  }, []);

  const refresh = useCallback(() => {
    const data = getAttribution();
    setAttribution(data);
    return data;
  }, []);

  return {
    attribution,
    isInitialized,
    refresh,
    isFromProductHunt:
      attribution?.source === "product-hunt" || attribution?.source === "producthunt.com",
    source: attribution?.source,
    medium: attribution?.medium,
    campaign: attribution?.campaign,
  };
}

// ============================================
// Product Hunt Detection Hook
// ============================================

/**
 * Hook to detect if user came from Product Hunt
 */
export function useProductHuntSource() {
  const { attribution, isInitialized, isFromProductHunt } = useAttribution();

  return {
    isFromProductHunt,
    isInitialized,
    campaign: isFromProductHunt ? attribution?.campaign : undefined,
    referrer: isFromProductHunt ? attribution?.referrer : undefined,
  };
}

// ============================================
// Launch Banner State Hook
// ============================================

interface LaunchBannerState {
  isDismissed: boolean;
  dismiss: () => void;
  reset: () => void;
}

const BANNER_DISMISSED_KEY = "nebutra_mkt_banner_dismissed";

/**
 * Hook to manage launch banner dismissal state
 */
export function useLaunchBannerState(bannerId?: string): LaunchBannerState {
  const storageKey = bannerId ? `${BANNER_DISMISSED_KEY}_${bannerId}` : BANNER_DISMISSED_KEY;

  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed
    try {
      const dismissed = localStorage.getItem(storageKey);
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    } catch {
      // Storage not available
    }
  }, [storageKey]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // Storage not available
    }

    // Track dismissal event
    trackMarketingEvent({
      name: "banner_dismissed",
      properties: { bannerId },
    });
  }, [storageKey, bannerId]);

  const reset = useCallback(() => {
    setIsDismissed(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Storage not available
    }
  }, [storageKey]);

  return { isDismissed, dismiss, reset };
}

// ============================================
// Countdown Hook
// ============================================

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
}

/**
 * Hook to create a countdown timer
 */
export function useCountdown(targetDate: string | Date): CountdownState {
  const [countdown, setCountdown] = useState<CountdownState>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: true,
    totalSeconds: 0,
  });

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const calculateCountdown = () => {
      const now = Date.now();
      const difference = target - now;

      if (difference <= 0) {
        setCountdown({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
          totalSeconds: 0,
        });
        return;
      }

      const totalSeconds = Math.floor(difference / 1000);
      setCountdown({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        isExpired: false,
        totalSeconds,
      });
    };

    calculateCountdown();
    const timer = setInterval(calculateCountdown, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return countdown;
}

// ============================================
// Intersection Observer Hook (for animations)
// ============================================

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * Hook to detect when an element is in viewport
 */
export function useInView<T extends HTMLElement = HTMLElement>(
  options: UseInViewOptions = {},
): [React.RefObject<T | null>, boolean] {
  const { threshold = 0.1, rootMargin = "0px", triggerOnce = true } = options;
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isInView];
}

// ============================================
// Marketing Event Hook
// ============================================

/**
 * Hook to easily track marketing events
 */
export function useMarketingEvents() {
  const { attribution } = useAttribution();

  const track = useCallback(
    (eventName: string, properties?: Record<string, unknown>) => {
      trackMarketingEvent({
        name: eventName,
        properties: {
          ...properties,
          source: attribution?.source,
          medium: attribution?.medium,
          campaign: attribution?.campaign,
        },
      });
    },
    [attribution],
  );

  const trackClick = useCallback(
    (elementId: string, properties?: Record<string, unknown>) => {
      track("click", { elementId, ...properties });
    },
    [track],
  );

  const trackPageView = useCallback(
    (pageName: string, properties?: Record<string, unknown>) => {
      track("page_view", { pageName, ...properties });
    },
    [track],
  );

  const trackCTA = useCallback(
    (ctaName: string, properties?: Record<string, unknown>) => {
      track("cta_click", { ctaName, ...properties });
    },
    [track],
  );

  return {
    track,
    trackClick,
    trackPageView,
    trackCTA,
  };
}
