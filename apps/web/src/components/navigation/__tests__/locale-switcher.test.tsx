// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.fn();
const useLocaleMock = vi.fn(() => "en-US");
const usePathnameMock = vi.fn(() => "/settings");

vi.mock("@nebutra/i18n/locale-switcher", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@nebutra/i18n/locale-switcher")>();
  return {
    ...actual,
    createLocaleSwitcher:
      (
        routing: { useRouter: () => { refresh: () => void } },
        config: { locales: string[]; labels: Record<string, string> },
      ) =>
      ({ ariaLabel, labels }: { ariaLabel?: string; labels?: Record<string, string> }) => {
        const locale = useLocaleMock();
        const router = routing.useRouter();
        const resolved = { ...config.labels, ...labels };
        return (
          <div>
            <button type="button" aria-label={ariaLabel}>
              EN
            </button>
            <div role="menu">
              {config.locales.map((nextLocale) => (
                <button
                  key={nextLocale}
                  type="button"
                  role="menuitem"
                  aria-current={nextLocale === locale ? "true" : undefined}
                  onClick={() => {
                    document.cookie = `NEXT_LOCALE=${nextLocale}; Path=/; SameSite=Lax`;
                    router.refresh();
                  }}
                >
                  {resolved[nextLocale] ?? nextLocale}
                </button>
              ))}
            </div>
          </div>
        );
      },
  };
});

vi.mock("next-intl", () => ({
  useLocale: () => useLocaleMock(),
  useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key),
}));

vi.mock("use-intl", () => ({
  useLocale: () => useLocaleMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
  usePathname: () => usePathnameMock(),
}));

import { LocaleSwitcher } from "../locale-switcher";

// Full PRODUCT_LANGUAGES wheel as canonical BCP-47 tags
const LOCALE_COUNT = 34;

describe("Navigation LocaleSwitcher", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    useLocaleMock.mockReturnValue("en-US");
    usePathnameMock.mockReturnValue("/settings");
    document.cookie = "";
  });

  afterEach(() => {
    // Explicit — Testing Library only auto-cleans when vitest runs with
    // `globals: true`. Without this every render stacked in the same document
    // and the second test onward hit "found multiple elements".
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the current locale label and trigger button", () => {
    render(<LocaleSwitcher />);
    const trigger = screen.getByRole("button", { name: /LocaleSwitcher\.ariaLabel/ });
    expect(trigger).toBeTruthy();
    expect(trigger.textContent).toMatch(/EN/i);
  });

  it("shows the full language wheel when opened", () => {
    render(<LocaleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /LocaleSwitcher\.ariaLabel/ }));
    const items = screen.getAllByRole("menuitem");
    expect(items.length).toBe(LOCALE_COUNT);
    // Endonyms, not blank / not 7-locale stub keys
    expect(items.some((el) => el.textContent?.includes("English"))).toBe(true);
    expect(items.some((el) => el.textContent?.includes("简体中文"))).toBe(true);
  });

  it("writes the NEXT_LOCALE cookie and calls router.refresh (cookie mode)", () => {
    render(<LocaleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /LocaleSwitcher\.ariaLabel/ }));
    const items = screen.getAllByRole("menuitem");
    const zh = items.find((el) => el.textContent?.includes("简体中文"));
    expect(zh).toBeTruthy();
    fireEvent.click(zh!);

    expect(document.cookie).toMatch(/NEXT_LOCALE=zh-Hans-CN/);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("marks the active locale with aria-current", () => {
    useLocaleMock.mockReturnValue("zh-Hans-CN");
    render(<LocaleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /LocaleSwitcher\.ariaLabel/ }));
    const items = screen.getAllByRole("menuitem");
    const zh = items.find((el) => el.getAttribute("aria-current") === "true");
    expect(zh?.textContent).toContain("简体中文");
  });
});
