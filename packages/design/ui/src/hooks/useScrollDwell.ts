"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

export interface DwellConfig {
  /** Time in ms before dwell is triggered (default: 800) */
  threshold?: number;
  /** Cooldown in ms between triggers (default: 5000) */
  cooldown?: number;
  /** Callback when dwell is detected */
  onDwell?: () => void;
  /** Only trigger when element is in viewport (default: true) */
  requireVisible?: boolean;
}

export interface DwellState {
  /** Whether the user is currently dwelling */
  isDwelling: boolean;
  /** Progress toward trigger threshold (0-1) */
  dwellProgress: number;
  /** Whether dwell was triggered (resets after cooldown) */
  hasTriggered: boolean;
  /** Manually reset the triggered state */
  reset: () => void;
}

/**
 * useScrollDwell - Detects when a user pauses scrolling over an element.
 *
 * This hook monitors scroll activity and detects "dwell" behavior where
 * the user stops scrolling for a specified duration. Useful for showing
 * contextual hints, tooltips, or triggering animations when a user
 * appears to be reading or studying content.
 *
 * @param ref - Reference to the element to monitor
 * @param config - Configuration options
 * @returns DwellState object with current dwell status
 *
 * @example
 * function FeatureSection() {
 *   const sectionRef = useRef<HTMLDivElement>(null);
 *   const { isDwelling, hasTriggered } = useScrollDwell(sectionRef, {
 *     threshold: 1000,
 *     cooldown: 10000,
 *     onDwell: () => console.log("User is reading this section"),
 *   });
 *
 *   return (
 *     <div ref={sectionRef}>
 *       {hasTriggered && <DwellHint message="Take a closer look!" />}
 *     </div>
 *   );
 * }
 */
export function useScrollDwell(
  ref: RefObject<HTMLElement | null>,
  config: DwellConfig = {},
): DwellState {
  const { threshold = 800, cooldown = 5000, onDwell, requireVisible = true } = config;

  const [isDwelling, setIsDwelling] = useState(false);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [hasTriggered, setHasTriggered] = useState(false);

  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef<number>(Date.now());
  const isInCooldownRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setHasTriggered(false);
    setIsDwelling(false);
    setDwellProgress(0);
    isInCooldownRef.current = false;
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  }, []);

  const isElementVisible = useCallback(() => {
    if (!ref.current) return false;
    const rect = ref.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Element is visible if at least 50% is in viewport
    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    const elementHeight = rect.height;

    return visibleHeight / elementHeight > 0.5;
  }, [ref]);

  const startDwellTimer = useCallback(() => {
    if (isInCooldownRef.current || hasTriggered) return;
    if (requireVisible && !isElementVisible()) return;

    clearTimers();

    // Start progress tracking
    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / threshold, 1);
      setDwellProgress(progress);

      if (progress >= 1) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }
    }, 50);

    // Set up dwell trigger
    dwellTimerRef.current = setTimeout(() => {
      setIsDwelling(true);
      setHasTriggered(true);
      onDwell?.();

      // Start cooldown
      isInCooldownRef.current = true;
      cooldownTimerRef.current = setTimeout(() => {
        isInCooldownRef.current = false;
        setHasTriggered(false);
        setDwellProgress(0);
      }, cooldown);
    }, threshold);
  }, [threshold, cooldown, onDwell, requireVisible, hasTriggered, isElementVisible, clearTimers]);

  const handleScroll = useCallback(() => {
    lastScrollTimeRef.current = Date.now();
    setIsDwelling(false);
    setDwellProgress(0);
    clearTimers();

    // Restart dwell detection after a short delay
    setTimeout(() => {
      const timeSinceScroll = Date.now() - lastScrollTimeRef.current;
      if (timeSinceScroll >= 100) {
        startDwellTimer();
      }
    }, 100);
  }, [clearTimers, startDwellTimer]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Start initial dwell timer if element is already visible
    if (requireVisible && isElementVisible()) {
      startDwellTimer();
    } else if (!requireVisible) {
      startDwellTimer();
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimers();
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, [handleScroll, startDwellTimer, requireVisible, isElementVisible, clearTimers]);

  return {
    isDwelling,
    dwellProgress,
    hasTriggered,
    reset,
  };
}

export default useScrollDwell;
