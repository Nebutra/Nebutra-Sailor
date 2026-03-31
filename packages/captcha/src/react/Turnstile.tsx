"use client";

/**
 * Cloudflare Turnstile React Component
 * https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback?: (token: string) => void;
  "error-callback"?: (error: string) => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
  action?: string;
  cData?: string;
  tabindex?: number;
  "response-field"?: boolean;
  "response-field-name"?: string;
  retry?: "auto" | "never";
  "retry-interval"?: number;
  "refresh-expired"?: "auto" | "manual" | "never";
  appearance?: "always" | "execute" | "interaction-only";
  language?: string;
}

export interface TurnstileProps {
  /** Site key from Cloudflare dashboard */
  siteKey?: string;
  /** Callback when verification succeeds */
  onSuccess?: (token: string) => void;
  /** Callback when verification fails */
  onError?: (error: string) => void;
  /** Callback when token expires */
  onExpire?: () => void;
  /** Widget theme */
  theme?: "light" | "dark" | "auto";
  /** Widget size */
  size?: "normal" | "compact" | "flexible";
  /** Action identifier for analytics */
  action?: string;
  /** Custom data to pass through verification */
  cData?: string;
  /** Tab index for accessibility */
  tabIndex?: number;
  /** Auto-retry on failure */
  retry?: "auto" | "never";
  /** Widget appearance mode */
  appearance?: "always" | "execute" | "interaction-only";
  /** Language code */
  language?: string;
  /** Additional CSS classes */
  className?: string;
}

// Script loading state
let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded) {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (scriptLoading) {
      return;
    }

    scriptLoading = true;

    // Set up callback
    window.onTurnstileLoad = () => {
      scriptLoaded = true;
      scriptLoading = false;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };

    // Create and append script
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

/**
 * Cloudflare Turnstile CAPTCHA Widget
 *
 * @example
 * ```tsx
 * <Turnstile
 *   siteKey="0x4AAAAA..."
 *   onSuccess={(token) => setToken(token)}
 *   onError={(error) => console.error(error)}
 * />
 * ```
 */
export function Turnstile({
  siteKey,
  onSuccess,
  onError,
  onExpire,
  theme = "auto",
  size = "normal",
  action,
  cData,
  tabIndex,
  retry = "auto",
  appearance = "always",
  language,
  className,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const uniqueId = useId();

  const effectiveSiteKey = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const handleSuccess = useCallback(
    (token: string) => {
      onSuccess?.(token);
    },
    [onSuccess],
  );

  const handleError = useCallback(
    (error: string) => {
      onError?.(error);
    },
    [onError],
  );

  const handleExpire = useCallback(() => {
    onExpire?.();
  }, [onExpire]);

  useEffect(() => {
    if (!effectiveSiteKey) {
      return;
    }

    loadTurnstileScript().then(() => {
      setIsReady(true);
    });
  }, [effectiveSiteKey]);

  useEffect(() => {
    if (!isReady || !containerRef.current || !window.turnstile || !effectiveSiteKey) {
      return;
    }

    // Remove existing widget if any
    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
    }

    // Render new widget
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: effectiveSiteKey,
      callback: handleSuccess,
      "error-callback": handleError,
      "expired-callback": handleExpire,
      theme,
      size,
      ...(action !== undefined ? { action } : {}),
      ...(cData !== undefined ? { cData } : {}),
      ...(tabIndex !== undefined ? { tabindex: tabIndex } : {}),
      retry,
      appearance,
      ...(language !== undefined ? { language } : {}),
    });

    // Cleanup on unmount
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [
    isReady,
    effectiveSiteKey,
    handleSuccess,
    handleError,
    handleExpire,
    theme,
    size,
    action,
    cData,
    tabIndex,
    retry,
    appearance,
    language,
  ]);

  return (
    <div
      ref={containerRef}
      id={`turnstile-${uniqueId}`}
      className={className}
      data-testid="turnstile-widget"
    />
  );
}

// Export reset and getResponse for external use
export type TurnstileRef = {
  reset: () => void;
  getResponse: () => string | undefined;
};

export default Turnstile;
