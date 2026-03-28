"use client";

/**
 * Cookie Consent Banner
 *
 * GDPR/CCPA compliant cookie consent banner with granular controls.
 * Follows Silicon Valley best practices for user privacy.
 */

import { useCallback, useEffect, useState } from "react";
import {
  acceptAllCookies,
  getCookieConsent,
  hasCookieConsent,
  recordCookieConsent,
  rejectAllCookies,
  saveCookieConsent,
  updateGTMConsent,
} from "../consent/service";
import { cookieCategories, cookieConfig } from "../documents/config";
import type { CookieCategory, CookiePreferences } from "../types";

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
  learnMore?: string;
  privacyPolicy?: string;
  cookiePolicy?: string;
}

const defaultTranslations: CookieBannerTranslations = {
  title: "We value your privacy",
  description:
    'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
  acceptAll: "Accept All",
  rejectAll: "Reject All",
  customize: "Customize",
  savePreferences: "Save Preferences",
  necessary: "Strictly Necessary",
  functional: "Functional",
  analytics: "Analytics",
  marketing: "Marketing",
  thirdParty: "Third-Party",
  learnMore: "Learn more",
  privacyPolicy: "Privacy Policy",
  cookiePolicy: "Cookie Policy",
};

// ============================================
// Cookie Banner Component
// ============================================

export function CookieBanner({
  onConsentGiven,
  show: controlledShow,
  position = cookieConfig.bannerPosition,
  persistToServer = true,
  className = "",
  translations: customTranslations = {},
}: CookieBannerProps) {
  const translations = { ...defaultTranslations, ...customTranslations };

  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<Omit<CookiePreferences, "necessary">>({
    functional: false,
    analytics: false,
    marketing: false,
    thirdParty: false,
  });

  // Initialize visibility
  useEffect(() => {
    if (controlledShow !== undefined) {
      setIsVisible(controlledShow);
    } else {
      // Show banner if no consent given yet
      const hasConsent = hasCookieConsent();
      setIsVisible(!hasConsent);
    }
  }, [controlledShow]);

  // Initialize preferences from existing consent
  useEffect(() => {
    const existingConsent = getCookieConsent();
    if (existingConsent) {
      setPreferences({
        functional: existingConsent.functional,
        analytics: existingConsent.analytics,
        marketing: existingConsent.marketing,
        thirdParty: existingConsent.thirdParty,
      });
    }
  }, []);

  const handleSaveConsent = useCallback(
    async (prefs: Omit<CookiePreferences, "necessary">) => {
      saveCookieConsent(prefs);

      const fullPreferences: CookiePreferences = {
        necessary: true,
        ...prefs,
      };

      // Update GTM consent
      updateGTMConsent(fullPreferences);

      // Persist to server if enabled
      if (persistToServer) {
        try {
          await recordCookieConsent(prefs);
        } catch (_error) {}
      }

      // Callback
      onConsentGiven?.(fullPreferences);

      // Hide banner
      setIsVisible(false);
    },
    [persistToServer, onConsentGiven],
  );

  const handleAcceptAll = useCallback(() => {
    acceptAllCookies();
    handleSaveConsent({
      functional: true,
      analytics: true,
      marketing: true,
      thirdParty: true,
    });
  }, [handleSaveConsent]);

  const handleRejectAll = useCallback(() => {
    rejectAllCookies();
    handleSaveConsent({
      functional: false,
      analytics: false,
      marketing: false,
      thirdParty: false,
    });
  }, [handleSaveConsent]);

  const handleSaveCustom = useCallback(() => {
    handleSaveConsent(preferences);
  }, [handleSaveConsent, preferences]);

  const toggleCategory = useCallback((category: keyof Omit<CookiePreferences, "necessary">) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  if (!isVisible) {
    return null;
  }

  const positionClasses = position === "top" ? "top-0 border-b" : "bottom-0 border-t";

  return (
    <div
      className={`fixed left-0 right-0 z-50 bg-white dark:bg-gray-900 shadow-lg ${positionClasses} ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-banner-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {!showDetails ? (
          // Simple view
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h2
                id="cookie-banner-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {translations.title}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {translations.description}{" "}
                <a href="/cookies" className="text-primary-600 hover:text-primary-700 underline">
                  {translations.cookiePolicy}
                </a>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {translations.customize}
              </button>
              <button
                type="button"
                onClick={handleRejectAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {translations.rejectAll}
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                {translations.acceptAll}
              </button>
            </div>
          </div>
        ) : (
          // Detailed view
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2
                id="cookie-banner-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {translations.title}
              </h2>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Close details"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Necessary - Always enabled */}
              <CookieCategoryToggle
                category={cookieCategories.find((c) => c.id === "necessary") as CookieCategory}
                enabled={true}
                disabled={true}
                label={translations.necessary ?? "Necessary"}
              />

              {/* Optional categories */}
              <CookieCategoryToggle
                category={cookieCategories.find((c) => c.id === "functional") as CookieCategory}
                enabled={preferences.functional}
                onToggle={() => toggleCategory("functional")}
                label={translations.functional ?? "Functional"}
              />
              <CookieCategoryToggle
                category={cookieCategories.find((c) => c.id === "analytics") as CookieCategory}
                enabled={preferences.analytics}
                onToggle={() => toggleCategory("analytics")}
                label={translations.analytics ?? "Analytics"}
              />
              <CookieCategoryToggle
                category={cookieCategories.find((c) => c.id === "marketing") as CookieCategory}
                enabled={preferences.marketing}
                onToggle={() => toggleCategory("marketing")}
                label={translations.marketing ?? "Marketing"}
              />
              <CookieCategoryToggle
                category={cookieCategories.find((c) => c.id === "thirdParty") as CookieCategory}
                enabled={preferences.thirdParty}
                onToggle={() => toggleCategory("thirdParty")}
                label={translations.thirdParty ?? "Third Party"}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleRejectAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {translations.rejectAll}
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {translations.acceptAll}
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                {translations.savePreferences}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Cookie Category Toggle
// ============================================

interface CookieCategoryToggleProps {
  category: CookieCategory;
  enabled: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  label: string;
}

function CookieCategoryToggle({
  category,
  enabled,
  disabled = false,
  onToggle,
  label,
}: CookieCategoryToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex-1 min-w-0">
        <label
          className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
          htmlFor={`cookie-${category.id}`}
        >
          {label}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{category.description}</p>
      </div>
      <div className="ml-3 flex-shrink-0">
        <button
          id={`cookie-${category.id}`}
          type="button"
          disabled={disabled}
          onClick={onToggle}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2
            ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
            ${enabled ? "bg-primary-600" : "bg-gray-200 dark:bg-gray-700"}
          `}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
              transition duration-200 ease-in-out
              ${enabled ? "translate-x-5" : "translate-x-0"}
            `}
          />
        </button>
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
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    } else {
      // Dispatch event to show cookie banner
      window.dispatchEvent(new CustomEvent("showCookieBanner"));
    }
  }, [onClick]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export default CookieBanner;
