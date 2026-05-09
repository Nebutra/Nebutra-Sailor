// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
const useLocaleMock = vi.fn(() => "en");
const usePathnameMock = vi.fn(() => "/settings");

vi.mock("next-intl", () => ({
  useLocale: () => useLocaleMock(),
  useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key),
}));

vi.mock("@nebutra/i18n/routing", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => usePathnameMock(),
}));

import { LocaleSwitcher } from "../locale-switcher";

describe("Navigation LocaleSwitcher", () => {
  beforeEach(() => {
    replaceMock.mockReset();
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

  it("shows both locale options when opened", () => {
    render(<LocaleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /LocaleSwitcher\.ariaLabel/ }));
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("LocaleSwitcher.en");
    expect(items[1].textContent).toContain("LocaleSwitcher.zh");
  });

  it("calls router.replace with the new locale and writes the NEXT_LOCALE cookie", () => {
    render(<LocaleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /LocaleSwitcher\.ariaLabel/ }));
    const items = screen.getAllByRole("menuitem");
    fireEvent.click(items[1]); // zh

    expect(replaceMock).toHaveBeenCalledWith("/settings", { locale: "zh" });
    expect(document.cookie).toMatch(/NEXT_LOCALE=zh/);
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
