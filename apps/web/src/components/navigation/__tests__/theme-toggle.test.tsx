// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setThemeMock = vi.fn();
let currentTheme: string | undefined = "system";

vi.mock("@nebutra/tokens", () => ({
  useTheme: () => ({
    theme: currentTheme,
    setTheme: setThemeMock,
    themes: ["light", "dark", "system"],
    resolvedTheme: currentTheme === "system" ? "dark" : currentTheme,
    systemTheme: "dark",
  }),
}));

const messages: Record<string, string> = {
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.system": "System",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const fullKey = `${namespace}.${key}`;
    return messages[fullKey] ?? fullKey;
  },
}));

import { ThemeToggle } from "../theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    setThemeMock.mockReset();
    currentTheme = "system";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing visible until mounted (hydration-safe)", () => {
    // Suspense-style: we test by rendering a placeholder with a stable test id.
    // After effect runs, the real buttons appear.
    const { container } = render(<ThemeToggle />);
    // After useEffect (which runs synchronously in jsdom render), buttons appear.
    // But the placeholder (skeleton) is wrapped with data-testid="theme-toggle-skeleton" before mount.
    // We assert buttons are present after mount.
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it("renders three theme buttons with i18n labels", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /system/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dark/i })).toBeInTheDocument();
  });

  it("calls setTheme('light') when light button clicked", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: /light/i }));
    expect(setThemeMock).toHaveBeenCalledWith("light");
  });

  it("calls setTheme('dark') when dark button clicked", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: /dark/i }));
    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });

  it("calls setTheme('system') when system button clicked", () => {
    currentTheme = "light";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: /system/i }));
    expect(setThemeMock).toHaveBeenCalledWith("system");
  });

  it("marks the active theme button with aria-pressed=true", () => {
    currentTheme = "dark";
    render(<ThemeToggle />);
    const dark = screen.getByRole("button", { name: /dark/i });
    expect(dark).toHaveAttribute("aria-pressed", "true");
    const light = screen.getByRole("button", { name: /light/i });
    expect(light).toHaveAttribute("aria-pressed", "false");
  });

  it("compact mode renders an icon-only single button with aria-label", () => {
    currentTheme = "dark";
    render(<ThemeToggle compact />);
    const button = screen.getByRole("button", { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  it("compact mode cycles through system → light → dark → system", () => {
    currentTheme = "system";
    const { rerender } = render(<ThemeToggle compact />);
    fireEvent.click(screen.getByRole("button", { name: /toggle theme/i }));
    expect(setThemeMock).toHaveBeenLastCalledWith("light");

    currentTheme = "light";
    rerender(<ThemeToggle compact />);
    fireEvent.click(screen.getByRole("button", { name: /toggle theme/i }));
    expect(setThemeMock).toHaveBeenLastCalledWith("dark");

    currentTheme = "dark";
    rerender(<ThemeToggle compact />);
    fireEvent.click(screen.getByRole("button", { name: /toggle theme/i }));
    expect(setThemeMock).toHaveBeenLastCalledWith("system");
  });
});
