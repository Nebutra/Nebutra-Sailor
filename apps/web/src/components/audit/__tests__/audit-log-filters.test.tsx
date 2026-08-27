// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

// Partial mock: the DS Select renders a base-ui listbox whose popup needs a
// pointer stack jsdom does not provide, so the options form is doubled by a
// native listbox that keeps the same value contract (`options` + onValueChange,
// with the data-testid on the control). Everything else — Input, Button — is
// the real primitive.
vi.mock("@nebutra/ui/primitives", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@nebutra/ui/primitives")>()),
  Select: ({
    value,
    onValueChange,
    options,
    id,
    "data-testid": dataTestId,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    options?: readonly { value: string; label: ReactNode }[];
    id?: string;
    "data-testid"?: string;
  }) => (
    <select
      id={id}
      data-testid={dataTestId}
      data-allow-native
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {options?.map((o) => (
        <option key={o.value} value={o.value}>
          {typeof o.label === "string" ? o.label : o.value}
        </option>
      ))}
    </select>
  ),
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

  it("cancels pending filter updates on unmount", () => {
    const onChange = vi.fn();
    const { unmount } = render(<AuditLogFilters onChange={onChange} />);

    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onChange).not.toHaveBeenCalled();
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
