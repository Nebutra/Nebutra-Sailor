"use client";

/**
 * The docs site's single-choice switch: a muted track with the chosen option
 * lifted onto it. A thin wrapper over the system ToggleGroup so the package
 * manager tabs, the playground's prop options and any future switch share one
 * look, one keyboard model (roving tab stop, arrows move and select) and one
 * set of states — instead of each hand-rolling aria-pressed chips.
 */

import { ToggleGroup, ToggleGroupItem } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";

export function Segmented<T extends string>({
  value,
  options,
  onValueChange,
  label,
  mono = false,
  className,
}: {
  value: T;
  options: readonly T[];
  onValueChange: (value: T) => void;
  /** Names the group for assistive tech; the visible label sits outside. */
  label: string;
  /** Option text is a code value (a prop value), so it is set in mono. */
  mono?: boolean;
  className?: string;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      className={cn("max-w-full flex-wrap justify-start gap-0.5 rounded-md p-0.5", className)}
      onValueChange={(next) => {
        if (typeof next === "string" && next !== "") onValueChange(next as T);
      }}
      type="single"
      value={value}
    >
      {options.map((option) => (
        <ToggleGroupItem
          className={cn(
            "h-7 rounded-[var(--radius-sm)] px-2.5 text-xs",
            mono && "font-mono",
            "active:scale-[0.97] motion-reduce:active:scale-100",
          )}
          key={option}
          value={option}
        >
          {option}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
