"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  buildConsent,
  type CookieConsent,
  type CookieConsentInput,
  getCookieConsent,
  setCookieConsent,
} from "@/lib/cookie-consent";

interface CookieConsentBannerProps {
  /**
   * Optional API endpoint to POST the consent payload to (e.g.
   * `https://app.nebutra.com/api/cookie-consent`). Failures are swallowed —
   * localStorage is the source of truth on the client.
   */
  apiEndpoint?: string;
}

type CategoryKey = "necessary" | "functional" | "analytics" | "marketing";

const CATEGORIES: ReadonlyArray<{ key: CategoryKey; alwaysOn: boolean }> = [
  { key: "necessary", alwaysOn: true },
  { key: "functional", alwaysOn: false },
  { key: "analytics", alwaysOn: false },
  { key: "marketing", alwaysOn: false },
];

/**
 * GDPR/CCPA cookie-consent banner.
 *
 * - Reads existing consent from localStorage on mount; if a fresh record
 *   exists, the banner renders nothing.
 * - "Accept all" sets every category to true.
 * - "Save preferences" persists the user's individual toggles.
 * - On save, optionally POSTs the consent payload to `apiEndpoint` for
 *   server-side audit (best-effort; errors are ignored).
 */
export function CookieConsentBanner({ apiEndpoint }: CookieConsentBannerProps = {}) {
  const t = useTranslations("cookieConsent");
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [toggles, setToggles] = useState<Record<CategoryKey, boolean>>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });

  // On mount: decide whether the banner should appear.
  useEffect(() => {
    setHydrated(true);
    const existing = getCookieConsent();
    if (!existing) setVisible(true);
  }, []);

  function handleToggle(key: CategoryKey) {
    if (key === "necessary") return;
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function persist(input: CookieConsentInput) {
    const consent: CookieConsent = buildConsent(input);
    setCookieConsent(consent);
    setVisible(false);

    if (apiEndpoint) {
      try {
        await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(consent),
          credentials: "include",
        });
      } catch {
        // best-effort audit; localStorage is the source of truth
      }
    }
  }

  function handleAcceptAll() {
    void persist({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
  }

  function handleSavePreferences() {
    void persist({
      necessary: true,
      functional: toggles.functional,
      analytics: toggles.analytics,
      marketing: toggles.marketing,
    });
  }

  if (!hydrated || !visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--neutral-7)] bg-[var(--neutral-1)]/95 p-4 shadow-lg backdrop-blur-md dark:bg-black/95 sm:p-6"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <h2
            id="cookie-consent-title"
            className="text-base font-semibold text-[var(--neutral-12)] dark:text-white"
          >
            {t("banner.title")}
          </h2>
          <p id="cookie-consent-description" className="mt-1 text-sm text-[var(--neutral-10)]">
            {t("banner.description")}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map(({ key, alwaysOn }) => {
              const inputId = `cookie-toggle-${key}`;
              return (
                <label
                  key={key}
                  htmlFor={inputId}
                  className="flex cursor-pointer items-start gap-2 rounded-[var(--radius-md)] border border-[var(--neutral-6)] p-3 transition-colors hover:border-[color:var(--blue-8)]"
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    aria-label={t(`toggle.${key}.label`)}
                    checked={toggles[key]}
                    disabled={alwaysOn}
                    onChange={() => handleToggle(key)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--neutral-7)]"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-[var(--neutral-12)] dark:text-white">
                      {t(`toggle.${key}.label`)}
                    </span>
                    <span className="block text-xs text-[var(--neutral-10)]">
                      {t(`toggle.${key}.description`)}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--brand-gradient)" }}
          >
            {t("button.acceptAll")}
          </button>
          <button
            type="button"
            onClick={handleSavePreferences}
            className="rounded-[var(--radius-md)] border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-4 py-2 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-3)] dark:text-white"
          >
            {t("button.savePreferences")}
          </button>
        </div>
      </div>
    </div>
  );
}
