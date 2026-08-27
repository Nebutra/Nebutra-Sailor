"use client";

import { ChevronLeft, ChevronRight } from "@nebutra/icons";
import type * as React from "react";
import {
  type ChevronProps,
  DayFlag,
  DayPicker,
  type DayPickerProps,
  type DayButtonProps as RdpDayButtonProps,
  SelectionState,
  UI,
} from "react-day-picker";
import { calendarTokens } from "../tokens/components/calendar";
import { cn } from "../utils/cn";

type CalendarCssVars = React.CSSProperties & {
  "--calendar-cell-size"?: string;
  "--calendar-cell-radius"?: string;
  "--calendar-cell-font-size"?: string;
  "--calendar-weekday-font-size"?: string;
  "--calendar-caption-font-size"?: string;
  "--calendar-nav-button-size"?: string;
  "--calendar-nav-icon-size"?: string;
  "--calendar-padding"?: string;
  "--calendar-month-gap"?: string;
  "--calendar-caption-gap"?: string;
};

function getCalendarStyle(style: React.CSSProperties | undefined): CalendarCssVars {
  return {
    "--calendar-cell-size": `${calendarTokens.cellSize}px`,
    "--calendar-cell-radius": `${calendarTokens.cellRadius}px`,
    "--calendar-cell-font-size": `${calendarTokens.cellFontSize}px`,
    "--calendar-weekday-font-size": `${calendarTokens.weekdayFontSize}px`,
    "--calendar-caption-font-size": `${calendarTokens.captionFontSize}px`,
    "--calendar-nav-button-size": `${calendarTokens.navButtonSize}px`,
    "--calendar-nav-icon-size": `${calendarTokens.navIconSize}px`,
    "--calendar-padding": `${calendarTokens.padding}px`,
    "--calendar-month-gap": `${calendarTokens.monthGap}px`,
    "--calendar-caption-gap": `${calendarTokens.captionGap}px`,
    ...style,
  };
}

const navButtonClassName = cn(
  "inline-flex size-[var(--calendar-nav-button-size)] items-center justify-center",
  "rounded-[var(--calendar-cell-radius)] text-muted-foreground",
  "transition-colors duration-micro ease-out",
  "hover:bg-accent hover:text-accent-foreground",
  "aria-disabled:pointer-events-none aria-disabled:opacity-40",
  "[&_svg]:size-[var(--calendar-nav-icon-size)]",
);

/**
 * Day visuals are resolved here rather than through `classNames`, because the
 * selection states overlap: a range endpoint is both `selected` and
 * `range_start`, and a middle day is `selected` without being a pill. Expressed
 * as CSS those cases collide on specificity and the winner depends on Tailwind's
 * emit order. Reading the modifiers directly makes the precedence explicit.
 */
function CalendarDayButton({ day: _day, modifiers, className, ...props }: RdpDayButtonProps) {
  const isRangeMiddle = Boolean(modifiers.range_middle);
  const isEndpoint = Boolean(modifiers.range_start) || Boolean(modifiers.range_end);
  const isPill = Boolean(modifiers.selected) && !isRangeMiddle;

  return (
    <button
      type="button"
      data-slot="calendar-day-button"
      className={cn(
        "relative flex size-[var(--calendar-cell-size)] items-center justify-center",
        "text-[length:var(--calendar-cell-font-size)] font-normal tabular-nums",
        "transition-colors duration-micro ease-out",
        // No focus ring here: the unlayered global `:focus-visible` rule in
        // design-tokens/static/base.css already outranks Tailwind utilities.
        "disabled:pointer-events-none disabled:opacity-40",
        // A middle day must not round, or the band it sits in breaks into beads.
        isRangeMiddle ? "rounded-none" : "rounded-[var(--calendar-cell-radius)]",
        isPill && "bg-primary font-medium text-primary-foreground hover:bg-primary",
        isRangeMiddle && "bg-transparent text-accent-foreground hover:bg-accent/60",
        !isPill && !isRangeMiddle && "text-foreground hover:bg-accent hover:text-accent-foreground",
        // Today reads as an outline so it survives being selected on top of it.
        Boolean(modifiers.today) && !isPill && "font-medium text-primary",
        Boolean(modifiers.outside) && !isPill && "text-muted-foreground/60",
        isEndpoint && "z-10",
        className,
      )}
      {...props}
    />
  );
}

function CalendarChevron({ orientation, className, ...props }: ChevronProps) {
  const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
  return <Icon aria-hidden="true" className={cn("shrink-0", className)} {...props} />;
}

export type CalendarProps = DayPickerProps;

/**
 * Month grid built on react-day-picker. Owns presentation only — selection mode,
 * value and constraints are the caller's, so the same grid backs the single-date
 * `DatePicker` and any range surface without forking.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  style,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      data-slot="calendar"
      showOutsideDays={showOutsideDays}
      className={cn("p-[var(--calendar-padding)] text-foreground", className)}
      style={getCalendarStyle(style)}
      classNames={{
        [UI.Months]: "relative flex flex-col gap-[var(--calendar-month-gap)] sm:flex-row",
        [UI.Month]: "flex flex-col gap-[var(--calendar-caption-gap)]",
        [UI.MonthCaption]: "flex h-[var(--calendar-nav-button-size)] items-center justify-center",
        [UI.CaptionLabel]:
          "select-none text-[length:var(--calendar-caption-font-size)] font-medium text-foreground",
        [UI.Nav]: "absolute inset-x-0 top-0 z-10 flex items-center justify-between",
        [UI.PreviousMonthButton]: navButtonClassName,
        [UI.NextMonthButton]: navButtonClassName,
        [UI.MonthGrid]: "w-full border-collapse",
        [UI.Weekdays]: "flex",
        [UI.Weekday]:
          "w-[var(--calendar-cell-size)] select-none pb-1 text-[length:var(--calendar-weekday-font-size)] font-normal text-muted-foreground",
        [UI.Week]: "mt-0.5 flex w-full",
        // The cell carries the connective band; the button carries the pill.
        [UI.Day]: "relative p-0 text-center",
        [SelectionState.range_start]:
          "rounded-l-[var(--calendar-cell-radius)] bg-accent [&:has(+td[data-selected])]:rounded-r-none",
        [SelectionState.range_middle]: "bg-accent",
        [SelectionState.range_end]: "rounded-r-[var(--calendar-cell-radius)] bg-accent",
        [DayFlag.outside]: "text-muted-foreground/60",
        [DayFlag.disabled]: "opacity-40",
        [DayFlag.hidden]: "invisible",
        [UI.WeekNumber]:
          "w-[var(--calendar-cell-size)] select-none text-[length:var(--calendar-weekday-font-size)] text-muted-foreground",
        [UI.WeekNumberHeader]: "w-[var(--calendar-cell-size)]",
        [UI.Footer]: "pt-2 text-center text-xs text-muted-foreground",
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
