/// <reference types="@testing-library/jest-dom" />
// @vitest-environment jsdom
/**
 * Guards the Next 16 cacheComponents fix: StarterFooter must never call
 * `new Date()` during its initial (server / pre-mount) render — that's the
 * "unstable value ... in a Client Component" error the footer used to throw
 * under /[lang]. The year is only read once `useMount()` flips true, the
 * same hydration-safe gate FooterMinimal already uses.
 */
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));
vi.mock("@nebutra/brand", () => ({
  BrandMark: () => <svg aria-label="brand-mark" />,
  BrandWordmark: () => <svg aria-label="brand-wordmark" />,
}));
vi.mock("@nebutra/brand/metadata", () => ({
  brand: { name: "Nebutra", nameFull: "Nebutra Sailor" },
}));
vi.mock("@/components/ui/theme-switcher", () => ({ ThemeSwitcher: () => null }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const useMountMock = vi.fn(() => false);
vi.mock("@/hooks/useMount", () => ({ useMount: () => useMountMock() }));

import { StarterFooter } from "../starter-footer";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StarterFooter", () => {
  it("does not call Date during the pre-mount render (Next 16 cacheComponents safety)", () => {
    useMountMock.mockReturnValue(false);
    const dateSpy = vi.spyOn(globalThis, "Date");

    render(<StarterFooter />);

    expect(dateSpy).not.toHaveBeenCalled();
    // The copyright line renders without a year before mount.
    expect(screen.getByText(/^©\s*Nebutra Sailor\./)).toBeInTheDocument();
  });

  it("shows the current year once mounted", () => {
    useMountMock.mockReturnValue(true);
    const fixedYear = 2031;
    vi.setSystemTime(new Date(`${fixedYear}-01-01T00:00:00Z`));

    render(<StarterFooter />);

    expect(
      screen.getByText(new RegExp(`©\\s*${fixedYear}\\s+Nebutra Sailor\\.`)),
    ).toBeInTheDocument();
    vi.useRealTimers();
  });
});
