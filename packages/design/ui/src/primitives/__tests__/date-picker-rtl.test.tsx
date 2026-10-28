import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DatePicker } from "../date-picker";

describe("DatePicker direction", () => {
  it("passes dir to the text field as well as the calendar", () => {
    render(<DatePicker dir="rtl" id="dp" label="Start date" />);
    expect(screen.getByLabelText("Start date")).toHaveAttribute("dir", "rtl");
  });

  it("leaves the field direction to its surroundings when dir is not set", () => {
    render(
      <div dir="rtl">
        <DatePicker id="dp" label="Start date" />
      </div>,
    );
    expect(screen.getByLabelText("Start date")).not.toHaveAttribute("dir");
  });
});

describe("DatePicker typed values against min and max", () => {
  it("does not commit a typed date before min", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DatePicker id="dp" label="Start date" min="2026-08-01" onValueChange={onValueChange} />,
    );
    await user.type(screen.getByLabelText("Start date"), "2026-07-15");
    expect(onValueChange).not.toHaveBeenCalledWith("2026-07-15");
    expect(screen.getByLabelText("Start date")).toHaveAttribute("aria-invalid", "true");
  });

  it("does not commit a typed date after max", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DatePicker id="dp" label="Start date" max="2026-08-31" onValueChange={onValueChange} />,
    );
    await user.type(screen.getByLabelText("Start date"), "2026-09-02");
    expect(onValueChange).not.toHaveBeenCalledWith("2026-09-02");
  });

  it("still commits a typed date inside the range, boundaries included", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DatePicker
        id="dp"
        label="Start date"
        max="2026-08-31"
        min="2026-08-01"
        onValueChange={onValueChange}
      />,
    );
    await user.type(screen.getByLabelText("Start date"), "2026-08-31");
    expect(onValueChange).toHaveBeenLastCalledWith("2026-08-31");
    expect(screen.getByLabelText("Start date")).not.toHaveAttribute("aria-invalid");
  });

  it("drops an out-of-range draft on blur and shows the committed value again", async () => {
    const user = userEvent.setup();
    render(<DatePicker defaultValue="2026-08-10" id="dp" label="Start date" min="2026-08-01" />);
    const field = screen.getByLabelText("Start date");
    await user.type(field, "{Control>}a{/Control}2026-07-15");
    await user.tab();
    expect(field).toHaveValue("2026-08-10");
  });
});
