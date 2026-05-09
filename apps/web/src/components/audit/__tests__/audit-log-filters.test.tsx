// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

import { AuditLogFilters } from "../audit-log-filters";

describe("AuditLogFilters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("debounces action input changes (300ms) before calling onChange", () => {
    const onChange = vi.fn();
    render(<AuditLogFilters onChange={onChange} />);

    // initial debounce timer fires
    act(() => {
      vi.advanceTimersByTime(300);
    });
    onChange.mockClear();

    const input = screen.getByTestId("audit-filter-action");
    fireEvent.change(input, { target: { value: "user.login" } });

    // not called yet
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ action: "user.login" }));
  });

  it("changes outcome and entityType immediately on select change", () => {
    const onChange = vi.fn();
    render(<AuditLogFilters onChange={onChange} />);
    onChange.mockClear();

    fireEvent.change(screen.getByTestId("audit-filter-outcome"), { target: { value: "failure" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: "failure" }));

    fireEvent.change(screen.getByTestId("audit-filter-entity"), {
      target: { value: "session" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ outcome: "failure", entityType: "session" }),
    );
  });

  it("resets all filters when reset button is clicked", () => {
    const onChange = vi.fn();
    render(<AuditLogFilters onChange={onChange} />);

    fireEvent.change(screen.getByTestId("audit-filter-action"), { target: { value: "x" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    onChange.mockClear();

    fireEvent.click(screen.getByTestId("audit-filter-reset"));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onChange).toHaveBeenLastCalledWith({});
    expect((screen.getByTestId("audit-filter-action") as HTMLInputElement).value).toBe("");
  });

  it("applies preset date range (24h) immediately", () => {
    const onChange = vi.fn();
    render(<AuditLogFilters onChange={onChange} />);
    onChange.mockClear();

    fireEvent.click(screen.getByTestId("audit-filter-range-24h"));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as {
      startDate?: string;
    };
    expect(lastCall.startDate).toBeDefined();
  });
});
