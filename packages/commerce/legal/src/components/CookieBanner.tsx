"use client";

/**
 * Cookie Consent Banner
 *
 * Concise GDPR/CCPA consent banner with progressive optional controls.
 */

import { useEffect, useState } from "react";
import {
  getCookieConsent,
  hasCookieConsent,
  recordCookieConsent,
  saveCookieConsent,
  updateGTMConsent,
} from "../consent/service";
import { cookieConfig } from "../documents/config";
import type { CookiePreferences } from "../types";

// ============================================
// Types
// ============================================

export interface CookieBannerProps {
  /** Callback when consent is given */
  onConsentGiven?: (preferences: CookiePreferences) => void;
  /** Whether to show the banner (controlled mode) */
  show?: boolean;
  /** Custom position */
  position?: "top" | "bottom";
  /** Whether to persist consent to server */
  persistToServer?: boolean;
  /** Custom class names */
  className?: string;
  /** Custom translations */
  translations?: CookieBannerTranslations;
}

export interface CookieBannerTranslations {
  title?: string;
  description?: string;
  acceptAll?: string;
  rejectAll?: string;
  customize?: string;
  savePreferences?: string;
  necessary?: string;
  functional?: string;
  analytics?: string;
  marketing?: string;
  thirdParty?: string;
  optionalCookies?: string;
  optionalCookiesDescription?: string;
  learnMore?: string;
  privacyPolicy?: string;
  cookiePolicy?: string;
}

const defaultTranslations: CookieBannerTranslations = {
  title: "Your Privacy Choices",
  description:
    "Nebutra uses necessary cookies to keep the site working. Optional cookies help improve the product and personalize content.",
  acceptAll: "Accept All",
  rejectAll: "Only Necessary",
  customize: "Manage Choices",
  savePreferences: "Save Choices",
  necessary: "Strictly Necessary",
  functional: "Functional",
  analytics: "Analytics",
  marketing: "Marketing",
  thirdParty: "Third-Party",
  optionalCookies: "Optional Cookies",
  optionalCookiesDescription:
    "Enable functional, analytics, marketing, and third-party cookies together.",
  learnMore: "Learn more",
  privacyPolicy: "Privacy Policy",
  cookiePolicy: "Cookie Policy",
};

const emptyTranslations: CookieBannerTranslations = {};

const defaultOptionalPreferences: Omit<CookiePreferences, "necessary"> = {
  functional: false,
  analytics: false,
  marketing: false,
  thirdParty: false,
};

function readStoredOptionalPreferences(): Omit<CookiePreferences, "necessary"> {
  const existingConsent = getCookieConsent();
  if (!existingConsent) {
    return defaultOptionalPreferences;
  }

  return {
    functional: existingConsent.functional,
    analytics: existingConsent.analytics,
    marketing: existingConsent.marketing,
    thirdParty: existingConsent.thirdParty,
  };
}

// ============================================
// Cookie Banner Component
// ============================================

export function CookieBanner({
  onConsentGiven,
  show: controlledShow,
  position = cookieConfig.bannerPosition,
  persistToServer = true,
  className = "",
  translations: customTranslations = emptyTranslations,
}: CookieBannerProps) {
  const translations = { ...defaultTranslations, ...customTranslations };

  const [uncontrolledVisible, setUncontrolledVisible] = useState(() => !hasCookieConsent());
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState(readStoredOptionalPreferences);
  const optionalCookiesEnabled = Object.values(preferences).some(Boolean);
  const isVisible = controlledShow ?? uncontrolledVisible;

  useEffect(() => {
    const openBanner = () => {
      setPreferences(readStoredOptionalPreferences());
      setShowDetails(true);
      setUncontrolledVisible(true);
    };

    window.addEventListener("showCookieBanner", openBanner);
    window.addEventListener("cookie-consent-open", openBanner);

    return () => {
      window.removeEventListener("showCookieBanner", openBanner);
      window.removeEventListener("cookie-consent-open", openBanner);
    };
  }, []);

  function setAllOptionalCookies(enabled: boolean) {
    setPreferences({
      functional: enabled,
      analytics: enabled,
      marketing: enabled,
      thirdParty: enabled,
    });
  }

  function toggleOptionalCookies() {
    setAllOptionalCookies(!optionalCookiesEnabled);
  }

  function togglePreferencesPanel() {
    setShowDetails((current) => !current);
  }

  async function saveConsent(prefs: Omit<CookiePreferences, "necessary">) {
    saveCookieConsent(prefs);

    const fullPreferences: CookiePreferences = {
      necessary: true,
      ...prefs,
    };

    updateGTMConsent(fullPreferences);

    if (persistToServer) {
      try {
        await recordCookieConsent(prefs);
      } catch (error) {
        // biome-ignore lint/suspicious/noConsole: silent client-side debug log; cookie prefs already persisted to localStorage
        console.debug("Failed to persist cookie consent to server", { error });
      }
    }

    onConsentGiven?.(fullPreferences);
    setUncontrolledVisible(false);
  }

  function acceptAll() {
    void saveConsent({
      functional: true,
      analytics: true,
      marketing: true,
      thirdParty: true,
    });
  }

  function saveNecessaryOnly() {
    void saveConsent({
      functional: false,
      analytics: false,
      marketing: false,
      thirdParty: false,
    });
  }

  function saveCustomPreferences() {
    void saveConsent(preferences);
  }

  if (!isVisible) {
    return null;
  }

  const positionClasses = position === "top" ? "top-0 border-b" : "bottom-0 border-t";
  const safeAreaClasses =
    position === "top"
      ? "pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3"
      : "pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]";
  const secondaryButtonClass =
    "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--blue-7)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--neutral-1)]";
  const primaryButtonClass =
    "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-12)] bg-[var(--neutral-12)] px-4 text-sm font-medium text-[var(--neutral-1)] transition-colors hover:bg-[var(--neutral-11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--blue-7)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--neutral-1)]";

  return (
    <div
      className={`fixed left-0 right-0 z-50 border-[var(--neutral-6)] bg-[var(--neutral-1)]/95 text-[var(--neutral-12)] shadow-lg backdrop-blur-md ${positionClasses} ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-banner-title"
      data-testid="cookie-banner"
    >
      <div
        className={`mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:px-6 lg:px-8 ${safeAreaClasses}`}
      >
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2
              id="cookie-banner-title"
              className="text-base font-semibold text-[var(--neutral-12)]"
            >
              {translations.title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--neutral-11)]">
              {translations.description}{" "}
              <a
                href="/cookies"
                className="font-medium text-[var(--brand-primary)] underline underline-offset-4 transition-colors hover:text-[var(--blue-10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--blue-7)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--neutral-1)]"
              >
                {translations.cookiePolicy}
              </a>
            </p>
          </div>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button type="button" onClick={saveNecessaryOnly} className={secondaryButtonClass}>
              {translations.rejectAll}
            </button>
            <button
              type="button"
              onClick={togglePreferencesPanel}
              className={secondaryButtonClass}
              aria-expanded={showDetails}
              aria-controls="cookie-preferences"
            >
              {translations.customize}
            </button>
            <button type="button" onClick={acceptAll} className={primaryButtonClass}>
              {translations.acceptAll}
            </button>
          </div>
        </div>

        {showDetails ? (
          <div
            id="cookie-preferences"
            className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-2)] p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p
                id="cookie-optional-label"
                className="text-sm font-medium text-[var(--neutral-12)]"
              >
                {translations.optionalCookies}
              </p>
              <p
                id="cookie-optional-description"
                className="mt-1 text-sm leading-5 text-[var(--neutral-11)]"
              >
                {translations.optionalCookiesDescription}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                id="cookie-optional"
                type="button"
                onClick={toggleOptionalCookies}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--blue-7)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--neutral-2)] ${
                  optionalCookiesEnabled ? "bg-[var(--neutral-12)]" : "bg-[var(--neutral-6)]"
                }`}
                role="switch"
                aria-checked={optionalCookiesEnabled}
                aria-labelledby="cookie-optional-label"
                aria-describedby="cookie-optional-description"
              >
                <span
                  className={`pointer-events-none inline-block size-5 rounded-full bg-[var(--neutral-1)] shadow transition-transform ${
                    optionalCookiesEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <button type="button" onClick={saveCustomPreferences} className={primaryButtonClass}>
                {translations.savePreferences}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ============================================
// Cookie Settings Button (to reopen banner)
// ============================================

export interface CookieSettingsButtonProps {
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function CookieSettingsButton({
  onClick,
  className = "",
  children = "Cookie Settings",
}: CookieSettingsButtonProps) {
  function openCookieSettings() {
    if (onClick) {
      onClick();
    } else {
      // Dispatch event to show cookie banner
      window.dispatchEvent(new CustomEvent("showCookieBanner"));
    }
  }

  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className={`text-sm text-[var(--neutral-11)] transition-colors hover:text-[var(--neutral-12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--blue-7)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--neutral-1)] ${className}`}
    >
      {children}
    </button>
  );
}

export default CookieBanner;
