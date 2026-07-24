/// <reference types="@testing-library/jest-dom" />
// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

import { FAQS } from "../../../lib/landing/faqs";
import { FAQSection } from "../faq-section";

describe("FAQSection", () => {
  afterEach(() => cleanup());

  it("renders the FAQ section heading", () => {
    render(<FAQSection />);
    expect(screen.getByRole("heading", { name: /landing\.faq\.title/ })).toBeInTheDocument();
  });

  it("renders one entry per FAQ in the catalog", () => {
    render(<FAQSection />);
    for (const entry of FAQS) {
      expect(screen.getByText(`landing.faq.items.${entry.id}.question`)).toBeInTheDocument();
    }
  });

  it("starts with all entries collapsed and exposes them as buttons", () => {
    render(<FAQSection />);
    const triggers = screen.getAllByRole("button");
    expect(triggers.length).toBeGreaterThanOrEqual(FAQS.length);
    for (const trigger of triggers.slice(0, FAQS.length)) {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("expands a single entry on click and collapses the others (accordion)", () => {
    render(<FAQSection />);
    const triggers = screen
      .getAllByRole("button")
      .filter((btn) => btn.getAttribute("aria-expanded") !== null);

    expect(triggers.length).toBe(FAQS.length);

    fireEvent.click(triggers[0]);
    expect(triggers[0]).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(triggers[1]);
    expect(triggers[1]).toHaveAttribute("aria-expanded", "true");
    expect(triggers[0]).toHaveAttribute("aria-expanded", "false");
  });

  it("collapses an open entry when its trigger is clicked again", () => {
    render(<FAQSection />);
    const triggers = screen
      .getAllByRole("button")
      .filter((btn) => btn.getAttribute("aria-expanded") !== null);

    fireEvent.click(triggers[0]);
    expect(triggers[0]).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(triggers[0]);
    expect(triggers[0]).toHaveAttribute("aria-expanded", "false");
  });
});
