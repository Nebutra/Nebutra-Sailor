// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.fn();
const useLocaleMock = vi.fn(() => "en");
const usePathnameMock = vi.fn(() => "/settings");

vi.mock("next-intl", () => ({
  useLocale: () => useLocaleMock(),
  useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key),
}));

// apps/web runs cookie-based i18n: the switcher imports next/navigation hooks
// (not @nebutra/i18n/routing) and, in cookie mode, writes the NEXT_LOCALE
// cookie then calls router.refresh() — no URL change, no router.replace.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
  usePathname: () => usePathnameMock(),
}));

import { LocaleSwitcher } from "../locale-switcher";

const LOCALE_COUNT = 7; // en, zh, de, es, fr, ja, ko

describe("Navigation LocaleSwitcher", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    useLocaleMock.mockReturnValue("en");
    usePathnameMock.mockReturnValue("/settings");
    document.cookie = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the current locale label and trigger button", () => {
    render(<LocaleSwitcher />);
    const trigger = screen.getByRole("button", { name: /LocaleSwitcher\.ariaLabel/ });
    expect(trigger).toBeTruthy();
    expect(trigger.textContent).toMatch(/EN/i);
  });

  it("shows all locale options when opened", () => {
    render(<LocaleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /LocaleSwitcher\.ariaLabel/ }));
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(LOCALE_COUNT);
    expect(items[0].textContent).toContain("LocaleSwitcher.en");
    expect(items[1].textContent).toContain("LocaleSwitcher.zh");
  });

  it("writes the NEXT_LOCALE cookie and calls router.refresh (cookie mode, no URL change)", () => {
    render(<LocaleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /LocaleSwitcher\.ariaLabel/ }));
    const items = screen.getAllByRole("menuitem");
    fireEvent.click(items[1]); // zh

    expect(document.cookie).toMatch(/NEXT_LOCALE=zh/);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("marks the active locale with aria-current", () => {
    useLocaleMock.mockReturnValue("zh");
    render(<LocaleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /LocaleSwitcher\.ariaLabel/ }));
    const items = screen.getAllByRole("menuitem");
    expect(items[1].getAttribute("aria-current")).toBe("true");
    expect(items[0].getAttribute("aria-current")).toBeNull();
  });
});
