// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

// jsdom in this workspace ships a stubbed Storage prototype whose methods are
// absent at runtime — install a minimal in-memory polyfill so tests for the
// localStorage-backed cookie consent helpers run reliably.
beforeAll(() => {
  if (typeof window.localStorage?.clear !== "function") {
    const store = new Map<string, string>();
    const polyfill: Storage = {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
      key: (index) => Array.from(store.keys())[index] ?? null,
      removeItem: (key) => {
        store.delete(key);
      },
      setItem: (key, value) => {
        store.set(key, String(value));
      },
    };
    Object.defineProperty(window, "localStorage", {
      value: polyfill,
      configurable: true,
      writable: true,
    });
  }
});

import {
  buildConsent,
  CONSENT_TTL_MS,
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsent,
  clearCookieConsent,
  getCookieConsent,
  hasAnalyticsConsent,
  hasFunctionalConsent,
  hasMarketingConsent,
  isConsentExpired,
  setCookieConsent,
} from "../cookie-consent";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe("cookie-consent helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe("buildConsent", () => {
    it("forces necessary=true even if caller passes false", () => {
      const consent = buildConsent({
        necessary: false as unknown as true,
        functional: true,
        analytics: false,
        marketing: false,
      });
      expect(consent.necessary).toBe(true);
    });

    it("attaches a timestamp and expiresAt 365 days out", () => {
      const before = Date.now();
      const consent = buildConsent({
        necessary: true,
        functional: false,
        analytics: false,
        marketing: false,
      });
      const after = Date.now();
      expect(consent.timestamp).toBeGreaterThanOrEqual(before);
      expect(consent.timestamp).toBeLessThanOrEqual(after);
      expect(consent.expiresAt - consent.timestamp).toBe(CONSENT_TTL_MS);
      expect(CONSENT_TTL_MS).toBe(365 * ONE_DAY_MS);
    });
  });

  describe("getCookieConsent / setCookieConsent", () => {
    it("returns null when storage is empty", () => {
      expect(getCookieConsent()).toBeNull();
    });

    it("returns null when stored value is malformed JSON", () => {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "{not valid json");
      expect(getCookieConsent()).toBeNull();
    });

    it("returns null when stored value is missing required fields", () => {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ functional: true }));
      expect(getCookieConsent()).toBeNull();
    });

    it("round-trips a valid consent payload", () => {
      const consent = buildConsent({
        necessary: true,
        functional: true,
        analytics: false,
        marketing: false,
      });
      setCookieConsent(consent);
      const read = getCookieConsent();
      expect(read).not.toBeNull();
      expect(read?.functional).toBe(true);
      expect(read?.analytics).toBe(false);
    });

    it("returns null when consent has expired", () => {
      const expired: CookieConsent = {
        necessary: true,
        functional: true,
        analytics: true,
        marketing: true,
        timestamp: Date.now() - CONSENT_TTL_MS - 1000,
        expiresAt: Date.now() - 1000,
      };
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(expired));
      expect(getCookieConsent()).toBeNull();
    });
  });

  describe("isConsentExpired", () => {
    it("treats consent at exactly the boundary as expired", () => {
      const now = Date.now();
      expect(isConsentExpired({ expiresAt: now } as CookieConsent, now + 1)).toBe(true);
    });

    it("returns false for fresh consent", () => {
      const consent = buildConsent({
        necessary: true,
        functional: false,
        analytics: false,
        marketing: false,
      });
      expect(isConsentExpired(consent)).toBe(false);
    });
  });

  describe("hasFunctionalConsent / hasAnalyticsConsent / hasMarketingConsent", () => {
    it("returns false when no consent stored", () => {
      expect(hasFunctionalConsent()).toBe(false);
      expect(hasAnalyticsConsent()).toBe(false);
      expect(hasMarketingConsent()).toBe(false);
    });

    it("returns the stored toggle values", () => {
      setCookieConsent(
        buildConsent({
          necessary: true,
          functional: true,
          analytics: false,
          marketing: true,
        }),
      );
      expect(hasFunctionalConsent()).toBe(true);
      expect(hasAnalyticsConsent()).toBe(false);
      expect(hasMarketingConsent()).toBe(true);
    });
  });

  describe("clearCookieConsent", () => {
    it("removes the storage entry", () => {
      setCookieConsent(
        buildConsent({
          necessary: true,
          functional: true,
          analytics: true,
          marketing: true,
        }),
      );
      expect(getCookieConsent()).not.toBeNull();
      clearCookieConsent();
      expect(getCookieConsent()).toBeNull();
    });
  });
});
