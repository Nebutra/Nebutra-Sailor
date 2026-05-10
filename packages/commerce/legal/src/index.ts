/**
 * @nebutra/legal
 *
 * Legal & Compliance infrastructure for Nebutra SaaS.
 * Provides GDPR/CCPA compliant consent management, legal document versioning,
 * and reusable React components.
 *
 * @example
 * ```typescript
 * import {
 *   CookieBanner,
 *   ConsentCheckbox,
 *   LegalFooter,
 *   legalConfig,
 *   recordDocumentConsent,
 * } from "@nebutra/legal";
 * ```
 */

// React components
export {
  ConsentCheckbox,
  type ConsentCheckboxProps,
  CookieBanner,
  type CookieBannerProps,
  type CookieBannerTranslations,
  CookieSettingsButton,
  type CookieSettingsButtonProps,
  LegalFooter,
  type LegalFooterProps,
  type LegalFooterTranslations,
  LegalLinks,
  type LegalLinksProps,
  MultiConsentCheckbox,
  type MultiConsentCheckboxProps,
} from "./components";
// Consent service
export {
  acceptAllCookies,
  type ConsentApiConfig,
  cacheDocumentConsent,
  // API client
  configureConsentApi,
  // Cookie consent
  defaultCookiePreferences,
  // Visitor ID
  generateVisitorId,
  getConsentStatus,
  getCookieConsent,
  getCookieConsentExpiry,
  // Document consent
  getDocumentConsents,
  getVisitorId,
  hasCookieConsent,
  hasDocumentConsentCached,
  initializeGTMConsentMode,
  isCookieCategoryAllowed,
  recordCookieConsent,
  recordDocumentConsent,
  rejectAllCookies,
  saveCookieConsent,
  // GTM integration
  updateGTMConsent,
} from "./consent";
// Document configuration
export {
  companyInfo,
  contactConfig,
  cookieCategories,
  cookieConfig,
  documentConfigs,
  getCookieCategory,
  getDocumentConfig,
  getDocumentsByType,
  getOptionalCookieCategories,
  getRequiredDocuments,
  legalConfig,
} from "./documents";
// Types
export * from "./types";
