"use client";

import * as React from "react";
import { cn } from "../utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterPillOption {
  value: string;
  label: string;
  /** Optional count badge after label, e.g. "All (24)" */
  count?: number;
  /** Optional leading icon */
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export type FilterPillsSize = "sm" | "md";

export type FilterPillsVariant = "solid" | "subtle";

interface FilterPillsBaseProps {
  options: FilterPillOption[];
  size?: FilterPillsSize;
  className?: string;
  /** Visual variant. "solid" = filled active state; "subtle" = lighter active. Default "solid". */
  variant?: FilterPillsVariant;
}

export interface FilterPillsSingleProps extends FilterPillsBaseProps {
  type?: "single";
  value: string;
  onValueChange: (value: string) => void;
}

export interface FilterPillsMultipleProps extends FilterPillsBaseProps {
  type: "multiple";
  value: string[];
  onValueChange: (value: string[]) => void;
}

export type FilterPillsProps = FilterPillsSingleProps | FilterPillsMultipleProps;

// ─── Style helpers ────────────────────────────────────────────────────────────

const pillBaseClass =
  "inline-flex items-center justify-center shrink-0 whitespace-nowrap rounded-full font-medium border transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const pillSizeClass: Record<FilterPillsSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-1.5",
};

const pillIconSizeClass: Record<FilterPillsSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-3.5 w-3.5",
};

const pillInactiveClass = "border-border bg-background text-foreground hover:bg-muted";

const pillActiveClass: Record<FilterPillsVariant, string> = {
  solid: "bg-foreground text-background border-foreground hover:bg-foreground",
  subtle: "bg-accent text-accent-foreground border-accent hover:bg-accent",
};

const pillDisabledClass = "opacity-40 pointer-events-none";

const countInactiveClass = "text-muted-foreground/80 ml-1 tabular-nums";
const countActiveClass = "text-current/80 ml-1 tabular-nums";

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * FilterPills — pill-style category filter row.
 *
 * Models the pill filter row in MiniMax / OpenAI GPT Store.
 * Single-select by default; multi-select optional. Horizontally scrollable
 * on overflow.
 *
 * @example Single-select (default)
 * ```tsx
 * const [category, setCategory] = useState("all");
 * <FilterPills
 *   value={category}
 *   onValueChange={setCategory}
 *   options={[
 *     { value: "all", label: "全部" },
 *     { value: "featured", label: "官方精选" },
 *     { value: "dev", label: "技术开发" },
 *   ]}
 * />
 * ```
 *
 * @example Multi-select
 * ```tsx
 * const [tags, setTags] = useState<string[]>([]);
 * <FilterPills
 *   type="multiple"
 *   value={tags}
 *   onValueChange={setTags}
 *   options={[...]}
 * />
 * ```
 */
export function FilterPills(props: FilterPillsProps): React.ReactElement {
  const { options, size = "md", variant = "solid", className } = props;

  const isMultiple = props.type === "multiple";

  const isActive = React.useCallback(
    (optionValue: string): boolean => {
      if (isMultiple) {
        return (props as FilterPillsMultipleProps).value.includes(optionValue);
      }
      return (props as FilterPillsSingleProps).value === optionValue;
    },
    [isMultiple, props],
  );

  const handleSelect = React.useCallback(
    (optionValue: string) => {
      if (isMultiple) {
        const multipleProps = props as FilterPillsMultipleProps;
        const current = multipleProps.value;
        const next = current.includes(optionValue)
          ? current.filter((v) => v !== optionValue)
          : [...current, optionValue];
        multipleProps.onValueChange(next);
      } else {
        const singleProps = props as FilterPillsSingleProps;
        // Single mode: clicking the active pill is allowed (no deselect).
        // Consumer drives behavior via onValueChange.
        singleProps.onValueChange(optionValue);
      }
    },
    [isMultiple, props],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, optionValue: string) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleSelect(optionValue);
      }
    },
    [handleSelect],
  );

  const role = isMultiple ? "checkbox" : "radio";

  return (
    <div
      role={isMultiple ? "group" : "radiogroup"}
      className={cn("flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1", className)}
    >
      {options.map((option) => {
        const active = isActive(option.value);
        const Icon = option.icon;
        const disabled = option.disabled === true;

        return (
          // biome-ignore lint/a11y/useAriaPropsSupportedByRole: role is dynamically "radio" or "checkbox" — both support aria-checked
          <button
            key={option.value}
            type="button"
            role={role}
            aria-checked={active}
            aria-disabled={disabled || undefined}
            data-state={active ? "on" : "off"}
            tabIndex={disabled ? -1 : 0}
            disabled={disabled}
            onClick={() => handleSelect(option.value)}
            onKeyDown={(event) => handleKeyDown(event, option.value)}
            className={cn(
              pillBaseClass,
              pillSizeClass[size],
              active ? pillActiveClass[variant] : pillInactiveClass,
              disabled && pillDisabledClass,
            )}
          >
            {Icon ? (
              <Icon className={cn(pillIconSizeClass[size], "shrink-0")} aria-hidden="true" />
            ) : null}
            <span>{option.label}</span>
            {typeof option.count === "number" ? (
              <span
                className={cn(active ? countActiveClass : countInactiveClass)}
                aria-hidden="true"
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
