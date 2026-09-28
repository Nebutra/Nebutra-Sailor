"use client";

import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { cn } from "../utils";
import { type ContributionDay, getContributionLevel } from "./github-calendar-data";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for GitHubCalendar component
 *
 * @description
 * A GitHub-style contribution heatmap calendar visualization.
 * Displays a year of contribution data in a grid format with color intensity
 * representing activity levels.
 *
 * **UX Scenarios:**
 * - User profile activity visualization (commits, posts, workouts)
 * - Habit tracking dashboards
 * - Learning streak displays
 * - Content creation frequency visualization
 * - Gaming achievement calendars
 *
 * **Data Integration:**
 * - GitHub API contributions
 * - Custom activity tracking systems
 * - CMS content publishing history
 * - E-commerce order frequency
 */
export interface GitHubCalendarProps {
  /** Array of contribution data for each day */
  data: ContributionDay[];
  /**
   * Custom color scale from least to most contributions
   * @default ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"]
   */
  colors?: string[];
  /**
   * Number of weeks to display
   * @default 53 (one year)
   */
  weeks?: number;
  /**
   * Custom thresholds for color mapping
   * Array of numbers defining count ranges for each color level
   * @default [0, 1, 2, 3, 4] (0=level0, 1=level1, 2=level2, 3=level3, 4+=level4)
   */
  thresholds?: number[];
  /**
   * Day labels for the left side
   * @default ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
   */
  dayLabels?: string[];
  /**
   * Whether to show day labels
   * @default true
   */
  showDayLabels?: boolean;
  /**
   * Whether to show month labels
   * @default true
   */
  showMonthLabels?: boolean;
  /**
   * Whether to show the legend
   * @default true
   */
  showLegend?: boolean;
  /**
   * Legend labels
   * @default { less: "Less", more: "More" }
   */
  legendLabels?: { less: string; more: string };
  /**
   * Tooltip formatter function
   * @default (date, count) => `${date}: ${count} contributions`
   */
  tooltipFormatter?: (date: string, count: number) => string;
  /** Container className */
  className?: string;
  /** Cell className */
  cellClassName?: string;
}

// =============================================================================
// Default Values
// =============================================================================

/**
 * Legacy GitHub-green default palette, kept for callers that pass their own
 * `colors` array. When `colors` is left unset the component renders the
 * token-based grayscale ramp below instead (`DEFAULT_LEVEL_CLASSES`), so it
 * reads correctly in both light and dark mode.
 */
const DEFAULT_COLORS = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

/**
 * Token-based grayscale ramp used whenever the caller does not supply a
 * custom `colors` array. Empty cells sit on `bg-muted`; each level up is a
 * rising `bg-foreground` opacity, so the ramp is legible in light and dark
 * without any hardcoded hex.
 */
const DEFAULT_LEVEL_CLASSES = [
  "bg-muted",
  "bg-foreground/20",
  "bg-foreground/40",
  "bg-foreground/65",
  "bg-foreground/90",
];

const DEFAULT_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// =============================================================================
// Helpers
// =============================================================================

// =============================================================================
// Component
// =============================================================================

/**
 * GitHubCalendar - Contribution heatmap calendar visualization
 *
 * @example
 * ```tsx
 * <GitHubCalendar
 *   data={[
 *     { date: "2025-01-01", count: 3 },
 *     { date: "2025-01-02", count: 1 },
 *   ]}
 *   colors={["#ebedf0", "#c6e48b", "#7bc96f", "#239a3b", "#196127"]}
 * />
 * ```
 */
export const GitHubCalendar: React.FC<GitHubCalendarProps> = ({
  data,
  colors = DEFAULT_COLORS,
  weeks = 53,
  thresholds,
  dayLabels = DEFAULT_DAY_LABELS,
  showDayLabels = true,
  showMonthLabels = true,
  showLegend = true,
  legendLabels = { less: "Less", more: "More" },
  tooltipFormatter,
  className,
  cellClassName,
}) => {
  const [contributions, setContributions] = useState<ContributionDay[]>([]);

  // Whether the caller left `colors` at its default — in that case cells are
  // painted with the token-based `DEFAULT_LEVEL_CLASSES` ramp (className)
  // rather than an inline `backgroundColor`, so dark mode stays legible.
  const usesDefaultRamp = colors === DEFAULT_COLORS;

  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(() => subDays(today, (weeks - 1) * 7), [today, weeks]);

  // Process data prop
  useEffect(() => {
    setContributions(data);
  }, [data]);

  const getLevel = (count: number): number =>
    getContributionLevel(count, thresholds, colors.length);

  // Get color based on contribution count (only used when `colors` is a
  // custom, caller-supplied CSS color array — see `usesDefaultRamp`).
  const getColor = (count: number): string => {
    const fallback = colors[0] ?? "#ebedf0";
    const level = getLevel(count);
    return colors[level] ?? fallback;
  };

  // Format tooltip
  const formatTooltip = (day: Date, count: number): string => {
    const dateStr = format(day, "PPP");
    if (tooltipFormatter) {
      return tooltipFormatter(dateStr, count);
    }
    return `${dateStr}: ${count} contributions`;
  };

  // Generate weeks array
  const weeksArray = useMemo(() => {
    const result: { days: Date[] }[] = [];
    let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 0 });

    for (let i = 0; i < weeks; i++) {
      const weekDays = eachDayOfInterval({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 0 }),
      });
      result.push({ days: weekDays });
      currentWeekStart = addDays(currentWeekStart, 7);
    }

    return result;
  }, [startDate, weeks]);

  // Generate month labels
  const monthLabels = useMemo(() => {
    const months: { label: string; index: number }[] = [];
    let currentMonth = -1;

    weeksArray.forEach((week, weekIndex) => {
      const firstDayOfWeek = week.days[0];
      if (!firstDayOfWeek) return;
      const month = firstDayOfWeek.getMonth();

      if (month !== currentMonth) {
        months.push({
          label: format(firstDayOfWeek, "MMM"),
          index: weekIndex,
        });
        currentMonth = month;
      }
    });

    return months;
  }, [weeksArray]);

  return (
    <div
      className={cn("rounded-[var(--radius-lg)] border border-border bg-background p-4", className)}
    >
      <div className="flex">
        {/* Day Labels */}
        {showDayLabels && (
          <div className="mr-2 mt-6 flex flex-col justify-between">
            {dayLabels.map((day, index) => (
              <span key={index} className="h-3 text-xs text-muted-foreground">
                {day}
              </span>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-x-auto">
          {/* Month Labels */}
          {showMonthLabels && (
            <div className="mb-2 flex">
              {monthLabels.map((month, index) => (
                <span
                  key={index}
                  className="text-xs text-muted-foreground"
                  style={{
                    marginLeft:
                      index === 0
                        ? 0
                        : `${(month.index - (monthLabels[index - 1]?.index ?? 0)) * 16 - 24}px`,
                  }}
                >
                  {month.label}
                </span>
              ))}
            </div>
          )}

          {/* Calendar Grid */}
          {/* biome-ignore lint/a11y/useSemanticElements: ARIA semantic rendering */}
          <div className="flex gap-1" role="grid">
            {weeksArray.map((week, weekIndex) => (
              // biome-ignore lint/a11y/useSemanticElements: ARIA semantic rendering
              <div key={weekIndex} className="flex flex-col gap-1" role="row">
                {week.days.map((day, dayIndex) => {
                  const contribution = contributions.find((c) => isSameDay(new Date(c.date), day));
                  const count = contribution?.count ?? 0;
                  const level = getLevel(count);

                  return (
                    // biome-ignore lint/a11y/useSemanticElements: ARIA semantic rendering
                    <div
                      key={dayIndex}
                      className={cn(
                        "h-3 w-3 rounded-[3px] transition-transform hover:scale-125",
                        usesDefaultRamp &&
                          (DEFAULT_LEVEL_CLASSES[level] ?? DEFAULT_LEVEL_CLASSES[0]),
                        cellClassName,
                      )}
                      style={usesDefaultRamp ? undefined : { backgroundColor: getColor(count) }}
                      title={formatTooltip(day, count)}
                      role="gridcell"
                      aria-label={formatTooltip(day, count)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs">
          <span className="text-muted-foreground">{legendLabels.less}</span>
          {usesDefaultRamp
            ? DEFAULT_LEVEL_CLASSES.map((levelClassName, index) => (
                <div
                  key={index}
                  className={cn("h-3 w-3 rounded-[3px]", levelClassName)}
                  aria-hidden="true"
                />
              ))
            : colors.map((color, index) => (
                <div
                  key={index}
                  className="h-3 w-3 rounded-[3px]"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
              ))}
          <span className="text-muted-foreground">{legendLabels.more}</span>
        </div>
      )}
    </div>
  );
};

export default GitHubCalendar;

// =============================================================================
// Data Adapters
// =============================================================================

export type { ContributionDay, WeeklyCommitActivity } from "./github-calendar-data";
export { fromWeeklyCommitActivity, getContributionLevel } from "./github-calendar-data";
