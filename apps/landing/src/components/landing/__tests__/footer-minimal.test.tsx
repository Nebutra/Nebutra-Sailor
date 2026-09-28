/// <reference types="@testing-library/jest-dom" />
// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

/*
 * What only the template's FooterMinimal has — social icons, the newsletter,
 * the status link. The contract every site footer shares is the e2e suite
 * e2e/smoke/site-footer.spec.ts, run against whichever footer the build serves.
 */

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));
vi.mock("@nebutra/tokens", () => ({ useTheme: () => ({ resolvedTheme: "dark" }) }));
vi.mock("@nebutra/brand", () => ({ Logo: () => <svg aria-label="logo" /> }));
vi.mock("@/hooks/useMount", () => ({ useMount: () => true }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/ui/theme-switcher", () => ({ ThemeSwitcher: () => null }));
vi.mock("../NewsletterForm", () => ({
  NewsletterForm: () => <form aria-label="Newsletter" />,
}));
vi.mock("../footer-status", () => ({
  FooterStatus: ({ href }: { href: string }) => <a href={href}>Status</a>,
}));

import { FooterMinimal } from "../FooterMinimal";

afterEach(cleanup);

describe("FooterMinimal", () => {
  it("carries the shared site-footer test id and a Footer landmark", () => {
    render(<FooterMinimal />);
    const footer = screen.getByTestId("site-footer");
    expect(within(footer).getByRole("navigation", { name: "Footer" })).toBeInTheDocument();
  });

  it("links social profiles with descriptive labels, in a new tab, without the opener", () => {
    render(<FooterMinimal />);
    const social = screen
      .getAllByRole("link")
      .filter((a) =>
        /Follow us|View on GitHub|Join our Discord/.test(a.getAttribute("aria-label") ?? ""),
      );
    expect(social.length).toBeGreaterThanOrEqual(3);
    for (const link of social) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.querySelector("svg")).not.toBeNull();
    }
  });

  it("offers the newsletter under its heading", () => {
    render(<FooterMinimal />);
    expect(screen.getByText("footer.newsletterTitle")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Newsletter" })).toBeInTheDocument();
  });

  it("links to the status page", () => {
    render(<FooterMinimal />);
    expect(screen.getByRole("link", { name: "Status" }).getAttribute("href")).toContain("status");
  });

  it("gives the legal variant the same test id", () => {
    render(<FooterMinimal variant="legal" />);
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
  });
});
