"use client";

/**
 * Legal Footer Component
 *
 * Displays legal links in a standardized footer format.
 * Commonly placed at the bottom of landing pages and app layouts.
 */

import { companyInfo } from "../documents/config";
import { CookieSettingsButton } from "./CookieBanner";

// ============================================
// Types
// ============================================

export interface LegalFooterProps {
  /** Show cookie settings link */
  showCookieSettings?: boolean;
  /** Callback when cookie settings is clicked */
  onCookieSettingsClick?: () => void;
  /** Custom class names */
  className?: string;
  /** Link style variant */
  variant?: "inline" | "stacked";
  /** Custom translations */
  translations?: LegalFooterTranslations;
}

export interface LegalFooterTranslations {
  privacy?: string;
  terms?: string;
  cookies?: string;
  refund?: string;
  cookieSettings?: string;
  copyright?: string;
}

const defaultTranslations: LegalFooterTranslations = {
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  cookies: "Cookie Policy",
  refund: "Refund Policy",
  cookieSettings: "Cookie Settings",
  copyright: `© ${new Date().getFullYear()} ${companyInfo.tradeName || companyInfo.legalName}. All rights reserved.`,
};

// ============================================
// Legal Footer Component
// ============================================

export function LegalFooter({
  showCookieSettings = true,
  onCookieSettingsClick,
  className = "",
  variant = "inline",
  translations: customTranslations = {},
}: LegalFooterProps) {
  const translations = { ...defaultTranslations, ...customTranslations };

  const links = [
    { href: "/privacy", label: translations.privacy },
    { href: "/terms", label: translations.terms },
    { href: "/cookies", label: translations.cookies },
    { href: "/refund", label: translations.refund },
  ];

  const linkClassName =
    "text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors";

  if (variant === "stacked") {
    return (
      <div className={`space-y-4 ${className}`}>
        <nav aria-label="Legal">
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={linkClassName}>
                  {link.label}
                </a>
              </li>
            ))}
            {showCookieSettings && (
              <li>
                <CookieSettingsButton onClick={onCookieSettingsClick} className={linkClassName}>
                  {translations.cookieSettings}
                </CookieSettingsButton>
              </li>
            )}
          </ul>
        </nav>
        <p className="text-sm text-gray-400 dark:text-gray-500">{translations.copyright}</p>
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {links.map((link) => (
          <a key={link.href} href={link.href} className={linkClassName}>
            {link.label}
          </a>
        ))}
        {showCookieSettings && (
          <CookieSettingsButton onClick={onCookieSettingsClick} className={linkClassName}>
            {translations.cookieSettings}
          </CookieSettingsButton>
        )}
      </nav>
      <p className="text-sm text-gray-400 dark:text-gray-500">{translations.copyright}</p>
    </div>
  );
}

// ============================================
// Minimal Legal Links (for compact footers)
// ============================================

export interface LegalLinksProps {
  /** Separator between links */
  separator?: string;
  /** Custom class names */
  className?: string;
  /** Links to show */
  links?: Array<"privacy" | "terms" | "cookies" | "refund">;
  /** Custom translations */
  translations?: Partial<LegalFooterTranslations>;
}

export function LegalLinks({
  separator = "·",
  className = "",
  links = ["privacy", "terms"],
  translations: customTranslations = {},
}: LegalLinksProps) {
  const translations = { ...defaultTranslations, ...customTranslations };

  const linkMap: Record<string, { href: string; label: string | undefined }> = {
    privacy: { href: "/privacy", label: translations.privacy },
    terms: { href: "/terms", label: translations.terms },
    cookies: { href: "/cookies", label: translations.cookies },
    refund: { href: "/refund", label: translations.refund },
  };

  return (
    <nav aria-label="Legal" className={`flex items-center gap-2 text-sm ${className}`}>
      {links.map((linkKey, index) => {
        const link = linkMap[linkKey];
        return (
          <span key={linkKey} className="flex items-center gap-2">
            {index > 0 && <span className="text-gray-300 dark:text-gray-600">{separator}</span>}
            <a
              href={link.href}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {link.label}
            </a>
          </span>
        );
      })}
    </nav>
  );
}

export default LegalFooter;
