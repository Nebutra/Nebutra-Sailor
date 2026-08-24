import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "../calendar";
import { DatePicker, parseIsoDate, toIsoDate } from "../date-picker";

/**
 * DatePicker exists to replace `<input type="date">`, whose popup is drawn by
 * the OS and ignores the theme. That swap is only safe if the contract the
 * native field offered survives, so these pin the parts a call site depends on:
 *
 *  1. the value stays `yyyy-MM-dd`, in and out,
 *  2. a date can still be typed, not only clicked,
 *  3. min/max still refuse out-of-range days,
 *  4. the calendar is ours — real buttons in the document, not an OS panel.
 */

describe("ISO helpers", () => {
  it("round-trips the wire format", () => {
    const parsed = parseIsoDate("2026-08-24");
    expect(parsed).toBeInstanceOf(Date);
    expect(toIsoDate(parsed as Date)).toBe("2026-08-24");
  });

  it("treats empty and malformed input as no date rather than Invalid Date", () => {
    expect(parseIsoDate("")).toBeUndefined();
    expect(parseIsoDate(undefined)).toBeUndefined();
    expect(parseIsoDate("not-a-date")).toBeUndefined();
    expect(parseIsoDate("2026-13-45")).toBeUndefined();
  });
});

describe("DatePicker", () => {
  it("renders the controlled value in the field", () => {
    render(<DatePicker id="dp" label="Start date" value="2026-08-24" />);

    expect(screen.getByLabelText("Start date")).toHaveValue("2026-08-24");
  });

  it("emits the ISO value when a date is typed", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<DatePicker id="dp" label="Start date" onValueChange={onValueChange} />);

    await user.type(screen.getByLabelText("Start date"), "2026-08-24");

    expect(onValueChange).toHaveBeenLastCalledWith("2026-08-24");
  });

  it("emits an empty string when the field is cleared", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DatePicker
        id="dp"
        label="Start date"
        defaultValue="2026-08-24"
        onValueChange={onValueChange}
      />,
    );

    await user.clear(screen.getByLabelText("Start date"));

    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  it("does not commit a half-typed value, and drops the draft on blur", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DatePicker id="dp" label="Start date" value="2026-08-24" onValueChange={onValueChange} />,
    );

    const field = screen.getByLabelText("Start date");
    await user.clear(field);
    onValueChange.mockClear();
    await user.type(field, "2026-0");

    expect(onValueChange).not.toHaveBeenCalled();

    await user.tab();

    // The unparseable draft is gone; the field shows the value again.
    expect(field).toHaveValue("2026-08-24");
  });

  it("opens a calendar rendered in the document, not an OS panel", async () => {
    const user = userEvent.setup();
    render(<DatePicker id="dp" label="Start date" value="2026-08-24" />);

    await user.click(screen.getByRole("button", { name: "Open calendar" }));

    expect(await screen.findByRole("grid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /24/ })).toBeInTheDocument();
  });

  it("commits the ISO value for the day picked in the calendar", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DatePicker id="dp" label="Start date" value="2026-08-24" onValueChange={onValueChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    await screen.findByRole("grid");
    await user.click(screen.getByRole("button", { name: /^Saturday, August 15/ }));

    expect(onValueChange).toHaveBeenCalledWith("2026-08-15");
  });

  it("refuses days outside min/max", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DatePicker
        id="dp"
        label="Start date"
        value="2026-08-24"
        min="2026-08-10"
        max="2026-08-28"
        onValueChange={onValueChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    await screen.findByRole("grid");

    expect(screen.getByRole("button", { name: /^Wednesday, August 5/ })).toBeDisabled();
  });

  it("associates the error message with the field", () => {
    render(<DatePicker id="dp" label="Start date" error="Pick a date to continue." />);

    const field = screen.getByLabelText("Start date");

    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Pick a date to continue.");
  });
});

describe("Calendar", () => {
  it("marks the selected day so it is perceivable, not only coloured", () => {
    render(
      <Calendar
        mode="single"
        selected={new Date(2026, 7, 24)}
        defaultMonth={new Date(2026, 7, 1)}
      />,
    );

    const selected = screen.getByRole("gridcell", { selected: true });

    expect(selected).toHaveAttribute("data-day", "2026-08-24");
  });
});
