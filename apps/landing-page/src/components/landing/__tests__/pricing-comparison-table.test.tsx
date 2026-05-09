/// <reference types="@testing-library/jest-dom" />
// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

import { COMPARISON_GROUPS, PLAN_IDS } from "../../../lib/landing/pricing-features";
import { PricingComparisonTable } from "../pricing-comparison-table";

describe("PricingComparisonTable", () => {
  afterEach(() => cleanup());

  it("renders a table with an accessible label", () => {
    render(<PricingComparisonTable />);
    const table = screen.getByRole("table");
    expect(table).toHaveAttribute("aria-label", "landing.comparison.ariaTable");
  });

  it("renders a column header per plan with scope='col'", () => {
    render(<PricingComparisonTable />);
    const table = screen.getByRole("table");
    for (const plan of PLAN_IDS) {
      const header = within(table).getByText(`landing.comparison.plan.${plan}`);
      // Climb to <th>
      const th = header.closest("th");
      expect(th).not.toBeNull();
      expect(th).toHaveAttribute("scope", "col");
    }
  });

  it("renders a section header row per feature group", () => {
    render(<PricingComparisonTable />);
    for (const group of COMPARISON_GROUPS) {
      expect(screen.getByText(`landing.comparison.feature.${group.id}.label`)).toBeInTheDocument();
    }
  });

  it("renders one row per feature with a row-scoped header", () => {
    render(<PricingComparisonTable />);
    let totalRows = 0;
    for (const group of COMPARISON_GROUPS) {
      for (const row of group.rows) {
        totalRows += 1;
        const cell = screen.getByText(`landing.comparison.feature.${group.id}.${row.id}`);
        const th = cell.closest("th");
        expect(th).not.toBeNull();
        expect(th).toHaveAttribute("scope", "row");
      }
    }
    expect(totalRows).toBeGreaterThan(0);
  });

  it("renders a check glyph for boolean true cells and a dash for false cells", () => {
    const { container } = render(<PricingComparisonTable />);
    const checks = container.querySelectorAll('[data-cell="check"]');
    const dashes = container.querySelectorAll('[data-cell="dash"]');
    let trueCount = 0;
    let falseCount = 0;
    for (const group of COMPARISON_GROUPS) {
      for (const row of group.rows) {
        for (const plan of PLAN_IDS) {
          const v = row.values[plan];
          if (v === true) trueCount += 1;
          else if (v === false) falseCount += 1;
        }
      }
    }
    expect(checks.length).toBe(trueCount);
    expect(dashes.length).toBe(falseCount);
  });
});
