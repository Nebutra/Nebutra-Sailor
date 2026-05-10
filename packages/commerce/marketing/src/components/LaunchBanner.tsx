"use client";
import { clsx } from "clsx";
import { useCallback, useEffect, useState } from "react";
import type { LaunchBannerProps } from "../types";

// ============================================
// Countdown Hook
// ============================================
interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}
function useCountdown(endDate: string | undefined): CountdownTime {
  const [countdown, setCountdown] = useState<CountdownTime>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: true,
  });
  useEffect(() => {
    if (!endDate) return;
    const targetDate = new Date(endDate).getTime();
    const calculateCountdown = () => {
      const now = Date.now();
      const difference = targetDate - now;
      if (difference <= 0) {
        setCountdown({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        });
        return;
      }
      setCountdown({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        isExpired: false,
      });
    };
    calculateCountdown();
    const timer = setInterval(calculateCountdown, 1000);
    return () => clearInterval(timer);
  }, [endDate]);
  return countdown;
}
// ============================================
// Countdown Display
// ============================================
function CountdownDisplay({ countdown }: { countdown: CountdownTime }) {
  if (countdown.isExpired) {
    return <span className="font-bold">🚀 Live Now!</span>;
  }
  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <span className="font-mono text-lg font-bold leading-none sm:text-xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase opacity-80">{label}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-2">
      <span className="mr-2 text-sm font-medium opacity-90">Launching in:</span>
      <div className="flex gap-1.5">
        {countdown.days > 0 && (
          <>
            <TimeUnit value={countdown.days} label="days" />
            <span className="font-bold opacity-60">:</span>
          </>
        )}
        <TimeUnit value={countdown.hours} label="hrs" />
        <span className="font-bold opacity-60">:</span>
        <TimeUnit value={countdown.minutes} label="min" />
        <span className="font-bold opacity-60">:</span>
        <TimeUnit value={countdown.seconds} label="sec" />
      </div>
    </div>
  );
}
// ============================================
// Close Button
// ============================================
function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-4 rounded-full p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
      aria-label="Dismiss banner"
    >
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M4 4L12 12M12 4L4 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
// ============================================
// Theme Styles (using CSS variables)
// ============================================
const getThemeStyles = (theme: "product-hunt" | "brand" | "neutral") => {
  const styles = {
    "product-hunt": {
      background: "var(--marketing-ph-primary)",
      text: "var(--marketing-fg-on-emphasis)",
      buttonBg: "var(--marketing-canvas-default)",
      buttonText: "var(--marketing-ph-primary)",
      buttonHoverBg: "var(--marketing-canvas-subtle)",
    },
    brand: {
      background: "var(--marketing-accent-emphasis)",
      text: "var(--marketing-fg-on-emphasis)",
      buttonBg: "var(--marketing-canvas-default)",
      buttonText: "var(--marketing-accent-fg)",
      buttonHoverBg: "var(--marketing-canvas-subtle)",
    },
    neutral: {
      background: "var(--marketing-canvas-inset)",
      text: "var(--marketing-fg-on-emphasis)",
      buttonBg: "var(--marketing-canvas-default)",
      buttonText: "var(--marketing-fg-default)",
      buttonHoverBg: "var(--marketing-canvas-subtle)",
    },
  };
  return styles[theme];
};
// ============================================
// Banner Variants
// ============================================
/**
 * Top Banner - Fixed at top of viewport
 */
export function LaunchBannerTop({
  title,
  subtitle,
  ctaText,
  ctaLink,
  theme = "product-hunt",
  dismissible = true,
  onDismiss,
  showCountdown = false,
  countdownEndDate,
  className,
}: LaunchBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const countdown = useCountdown(showCountdown ? countdownEndDate : undefined);
  const styles = getThemeStyles(theme);
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);
  if (isDismissed) return null;
  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
    <div
      className={clsx("fixed inset-x-0 top-0 z-50", className)}
      style={{
        backgroundColor: styles.background,
        color: styles.text,
      }}
      role="banner"
      aria-label="Launch announcement"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 px-4 py-3">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              🚀
            </span>
            <span className="font-semibold">{title}</span>
            {subtitle && <span className="hidden opacity-90 sm:inline">— {subtitle}</span>}
          </div>
          {showCountdown && <CountdownDisplay countdown={countdown} />}
          <a
            href={ctaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: styles.buttonBg,
              color: styles.buttonText,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = styles.buttonHoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = styles.buttonBg;
            }}
          >
            {ctaText}
          </a>
        </div>
        {dismissible && <CloseButton onClick={handleDismiss} />}
      </div>
    </div>
  );
}
/**
 * Floating Banner - Positioned at bottom-right
 */
export function LaunchBannerFloating({
  title,
  subtitle,
  ctaText,
  ctaLink,
  theme = "product-hunt",
  dismissible = true,
  onDismiss,
  showCountdown = false,
  countdownEndDate,
  className,
}: LaunchBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const countdown = useCountdown(showCountdown ? countdownEndDate : undefined);
  const styles = getThemeStyles(theme);
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);
  if (isDismissed) return null;
  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
    <div
      className={clsx("fixed bottom-4 right-4 z-50 max-w-sm rounded-xl p-4 shadow-2xl", className)}
      style={{
        backgroundColor: styles.background,
        color: styles.text,
      }}
      role="banner"
      aria-label="Launch announcement"
    >
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
          aria-label="Dismiss banner"
        >
          <svg aria-hidden="true" width={14} height={14} viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">
            🚀
          </span>
          <div>
            <h3 className="font-bold">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm opacity-90">{subtitle}</p>}
          </div>
        </div>
        {showCountdown && (
          <div className="rounded-lg p-2" style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }}>
            <CountdownDisplay countdown={countdown} />
          </div>
        )}
        <a
          href={ctaLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg px-4 py-2 text-center font-semibold transition-colors"
          style={{
            backgroundColor: styles.buttonBg,
            color: styles.buttonText,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = styles.buttonHoverBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = styles.buttonBg;
          }}
        >
          {ctaText}
        </a>
      </div>
    </div>
  );
}
/**
 * Inline Banner - For embedding in page content
 */
export function LaunchBannerInline({
  title,
  subtitle,
  ctaText,
  ctaLink,
  theme = "product-hunt",
  showCountdown = false,
  countdownEndDate,
  className,
}: LaunchBannerProps) {
  const countdown = useCountdown(showCountdown ? countdownEndDate : undefined);
  const styles = getThemeStyles(theme);
  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
    <div
      className={clsx("rounded-xl p-6", className)}
      style={{
        backgroundColor: styles.background,
        color: styles.text,
      }}
      role="banner"
      aria-label="Launch announcement"
    >
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <span className="text-4xl" aria-hidden="true">
          🚀
        </span>
        <div className="flex-1">
          <h3 className="text-xl font-bold">{title}</h3>
          {subtitle && <p className="mt-1 opacity-90">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-center gap-3 sm:items-end">
          {showCountdown && <CountdownDisplay countdown={countdown} />}
          <a
            href={ctaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-6 py-2.5 font-semibold transition-colors"
            style={{
              backgroundColor: styles.buttonBg,
              color: styles.buttonText,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = styles.buttonHoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = styles.buttonBg;
            }}
          >
            {ctaText}
          </a>
        </div>
      </div>
    </div>
  );
}
// ============================================
// Main Export - Auto-selects variant
// ============================================
export function LaunchBanner({ variant = "top", ...props }: LaunchBannerProps) {
  switch (variant) {
    case "floating":
      return <LaunchBannerFloating {...props} />;
    case "inline":
      return <LaunchBannerInline {...props} />;
    default:
      return <LaunchBannerTop {...props} />;
  }
}
export default LaunchBanner;
