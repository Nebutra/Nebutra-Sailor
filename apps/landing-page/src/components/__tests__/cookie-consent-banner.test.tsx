/// <reference types="@testing-library/jest-dom" />
// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

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

const messages: Record<string, string> = {
  "cookieConsent.banner.title": "Your privacy choices",
  "cookieConsent.banner.description":
    "We use cookies to improve your experience. Choose which categories to allow.",
  "cookieConsent.button.acceptAll": "Accept all",
  "cookieConsent.button.savePreferences": "Save preferences",
  "cookieConsent.toggle.necessary.label": "Necessary",
  "cookieConsent.toggle.necessary.description": "Required for the site to work.",
  "cookieConsent.toggle.functional.label": "Functional",
  "cookieConsent.toggle.functional.description": "Remember your preferences.",
  "cookieConsent.toggle.analytics.label": "Analytics",
  "cookieConsent.toggle.analytics.description": "Help us improve the site.",
  "cookieConsent.toggle.marketing.label": "Marketing",
  "cookieConsent.toggle.marketing.description": "Personalized ads.",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const fullKey = `${namespace}.${key}`;
    return messages[fullKey] ?? fullKey;
  },
}));

import {
  buildConsent,
  CONSENT_TTL_MS,
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsent,
} from "../../lib/cookie-consent";
import { CookieConsentBanner } from "../cookie-consent-banner";

describe("CookieConsentBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders when no consent has been stored", () => {
    render(<CookieConsentBanner />);
    expect(screen.getByText("Your privacy choices")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept all" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save preferences" })).toBeInTheDocument();
  });

  it("does not render when fresh consent already exists", () => {
    const consent = buildConsent({
      necessary: true,
      functional: true,
      analytics: false,
      marketing: false,
    });
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
    const { container } = render(<CookieConsentBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders again when stored consent is expired", () => {
    const expired: CookieConsent = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now() - CONSENT_TTL_MS - 1000,
      expiresAt: Date.now() - 1000,
    };
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(expired));
    render(<CookieConsentBanner />);
    expect(screen.getByText("Your privacy choices")).toBeInTheDocument();
  });

  it("disables the necessary toggle (always-on)", () => {
    render(<CookieConsentBanner />);
    const necessary = screen.getByRole("checkbox", { name: /necessary/i });
    expect(necessary).toBeChecked();
    expect(necessary).toBeDisabled();
  });

  it("Accept all writes a consent record with all toggles true and hides the banner", async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);

    await user.click(screen.getByRole("button", { name: "Accept all" }));

    await waitFor(() => {
      expect(screen.queryByText("Your privacy choices")).not.toBeInTheDocument();
    });

    const stored = JSON.parse(
      window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) ?? "null",
    ) as CookieConsent | null;
    expect(stored).not.toBeNull();
    expect(stored?.necessary).toBe(true);
    expect(stored?.functional).toBe(true);
    expect(stored?.analytics).toBe(true);
    expect(stored?.marketing).toBe(true);
  });

  it("Save preferences writes only the toggled categories and hides the banner", async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);

    // Default: only necessary is checked. Toggle analytics on.
    await user.click(screen.getByRole("checkbox", { name: /analytics/i }));
    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    await waitFor(() => {
      expect(screen.queryByText("Your privacy choices")).not.toBeInTheDocument();
    });

    const stored = JSON.parse(
      window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) ?? "null",
    ) as CookieConsent | null;
    expect(stored).not.toBeNull();
    expect(stored?.functional).toBe(false);
    expect(stored?.analytics).toBe(true);
    expect(stored?.marketing).toBe(false);
  });

  it("POSTs the consent payload to /api/cookie-consent on save", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const user = userEvent.setup();
    render(<CookieConsentBanner apiEndpoint="/api/cookie-consent" />);

    await user.click(screen.getByRole("button", { name: "Accept all" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/cookie-consent");
    expect((init as RequestInit).method).toBe("POST");
  });
});
