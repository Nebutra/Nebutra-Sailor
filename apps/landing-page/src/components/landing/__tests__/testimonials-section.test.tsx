/// <reference types="@testing-library/jest-dom" />
// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

import { TESTIMONIALS } from "../../../lib/landing/testimonials";
import { TestimonialsSection } from "../testimonials-section";

describe("TestimonialsSection", () => {
  afterEach(() => cleanup());

  it("renders the section heading", () => {
    render(<TestimonialsSection />);
    expect(
      screen.getByRole("heading", { name: /landing\.testimonials\.title/ }),
    ).toBeInTheDocument();
  });

  it("renders every testimonial quote", () => {
    render(<TestimonialsSection />);
    for (const t of TESTIMONIALS) {
      // The quote sits inside a blockquote that also contains opening/closing
      // smart quotes as sibling text nodes, so we match by substring.
      const matches = screen.getAllByText((_content, node) => {
        if (!node) return false;
        return node.textContent?.includes(t.quote) ?? false;
      });
      expect(matches.length).toBeGreaterThan(0);
    }
  });

  it("renders every testimonial author and company", () => {
    render(<TestimonialsSection />);
    for (const t of TESTIMONIALS) {
      expect(screen.getByText(t.name)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(t.company))).toBeInTheDocument();
    }
  });

  it("renders the testimonials inside a list with one item per testimonial", () => {
    render(<TestimonialsSection />);
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(TESTIMONIALS.length);
  });

  it("uses a responsive grid container for the cards", () => {
    const { container } = render(<TestimonialsSection />);
    const grid = container.querySelector('[data-testid="testimonials-grid"]');
    expect(grid).not.toBeNull();
    expect(grid?.className).toMatch(/grid/);
    expect(grid?.className).toMatch(/md:grid-cols-2/);
    expect(grid?.className).toMatch(/lg:grid-cols-3/);
  });
});
