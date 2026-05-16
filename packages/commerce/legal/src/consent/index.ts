export type { ConsentApiConfig } from "./service";
export {
  acceptAllCookies,
  cacheDocumentConsent,
  // API client
  configureConsentApi,
  createConsentPersistenceService,
  createMemoryConsentStore,
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
  resolveConsentStatus,
  saveCookieConsent,
  // GTM integration
  updateGTMConsent,
} from "./service";
