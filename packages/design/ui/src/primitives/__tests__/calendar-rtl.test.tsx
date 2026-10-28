import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Calendar } from "../calendar";

const CALENDAR_TIMEOUT_MS = 20_000;

function navIcon(name: RegExp) {
  return screen.getByRole("button", { name }).querySelector("svg");
}

describe("Calendar in a right-to-left tree", () => {
  it(
    "points the previous-month chevron toward the inline start without a dir prop",
    () => {
      render(
        <div dir="rtl">
          <Calendar defaultMonth={new Date(2026, 7, 1)} mode="single" />
        </div>,
      );
      expect(navIcon(/previous month/i)).toHaveAttribute("data-orientation", "right");
      expect(navIcon(/next month/i)).toHaveAttribute("data-orientation", "left");
    },
    CALENDAR_TIMEOUT_MS,
  );

  it(
    "keeps the left/right chevrons in a left-to-right tree",
    () => {
      render(
        <div dir="ltr">
          <Calendar defaultMonth={new Date(2026, 7, 1)} mode="single" />
        </div>,
      );
      expect(navIcon(/previous month/i)).toHaveAttribute("data-orientation", "left");
      expect(navIcon(/next month/i)).toHaveAttribute("data-orientation", "right");
    },
    CALENDAR_TIMEOUT_MS,
  );

  it(
    "lets an explicit dir prop override the surrounding direction",
    () => {
      render(
        <div dir="rtl">
          <Calendar defaultMonth={new Date(2026, 7, 1)} dir="ltr" mode="single" />
        </div>,
      );
      expect(navIcon(/previous month/i)).toHaveAttribute("data-orientation", "left");
    },
    CALENDAR_TIMEOUT_MS,
  );

  it(
    "moves focus to the previous day on ArrowRight",
    async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div dir="rtl">
          <Calendar defaultMonth={new Date(2026, 7, 1)} mode="single" />
        </div>,
      );
      const day = screen.getByRole("button", { name: /August 12(th)?,/ });
      day.focus();
      await user.keyboard("{ArrowRight}");
      // jsdom does not move DOM focus here; react-day-picker marks its focused cell instead.
      expect(container.querySelector("[data-focused]")?.textContent).toBe("11");
    },
    CALENDAR_TIMEOUT_MS,
  );

  it(
    "moves focus to the next day on ArrowRight in a left-to-right tree",
    async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div dir="ltr">
          <Calendar defaultMonth={new Date(2026, 7, 1)} mode="single" />
        </div>,
      );
      screen.getByRole("button", { name: /August 12(th)?,/ }).focus();
      await user.keyboard("{ArrowRight}");
      expect(container.querySelector("[data-focused]")?.textContent).toBe("13");
    },
    CALENDAR_TIMEOUT_MS,
  );
});
