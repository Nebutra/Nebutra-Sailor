/// <reference types="@testing-library/jest-dom" />
// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock("react-tweet", () => ({
  Tweet: () => null,
}));

import en from "../../../../messages/en.json" with { type: "json" };
import { COMPARISON_GROUPS, PLAN_IDS } from "../../../lib/landing/pricing-features";
import { PricingComparisonTable } from "../pricing-comparison-table";

/**
 * Governance: every (group.id, row.id) in COMPARISON_GROUPS must have a matching
 * `landing.comparison.feature.${group.id}.{label,row.id}` key in en.json — and
 * no orphan keys may live under that namespace. We learned this the hard way
 * when license.projects + source.update-window rendered as raw key paths in
 * production after the data file was refactored but i18n was not.
 */
describe("landing.comparison.feature ↔ COMPARISON_GROUPS parity", () => {
  const featureNs = (
    en as { landing: { comparison: { feature: Record<string, Record<string, unknown>> } } }
  ).landing.comparison.feature;

  it("every group + row id has a translation", () => {
    for (const group of COMPARISON_GROUPS) {
      const grp = featureNs[group.id];
      expect(grp, `missing feature.${group.id}`).toBeDefined();
      expect(grp?.label, `missing feature.${group.id}.label`).toBeDefined();
      for (const row of group.rows) {
        expect(grp?.[row.id], `missing feature.${group.id}.${row.id}`).toBeDefined();
      }
    }
  });

  it("no orphan keys under landing.comparison.feature", () => {
    const expected = new Set<string>();
    for (const group of COMPARISON_GROUPS) {
      expected.add(`${group.id}.label`);
      for (const row of group.rows) expected.add(`${group.id}.${row.id}`);
    }
    const actual = new Set<string>();
    for (const [groupId, leaves] of Object.entries(featureNs)) {
      for (const leafKey of Object.keys(leaves)) actual.add(`${groupId}.${leafKey}`);
    }
    const orphans = [...actual].filter((k) => !expected.has(k));
    expect(orphans, `orphan i18n keys: ${orphans.join(", ")}`).toEqual([]);
  });
});

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
