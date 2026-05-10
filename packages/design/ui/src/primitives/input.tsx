"use client";

import { Loader2, X } from "lucide-react";
import * as React from "react";
import { cn } from "../utils/cn";
import { Kbd } from "./kbd";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix" | "size"> {
  /** Visual size variant */
  size?: "sm" | "md" | "lg";
  /** Icon or node rendered inside the left edge. Non-interactive — clicks pass through to the input. */
  prefix?: React.ReactNode;
  /** Icon or node rendered inside the right edge. Hidden when the clear button is active. */
  suffix?: React.ReactNode;
  /** Show a ✕ button when the field has a value. Tracks value internally for uncontrolled inputs. */
  clearable?: boolean;
  /** Called when the ✕ button is clicked. */
  onClear?: () => void;
  /**
   * Keyboard shortcut badge shown on the right (e.g. "⌘K").
   * Transitions to a loading spinner when the field has a value.
   */
  shortcut?: string;
  /** Extra className applied to the outer `<div>` wrapper (only rendered when prefix/suffix/clearable is used). */
  wrapperClassName?: string;
}

const sizeStyles = {
  sm: "h-8 text-xs",
  md: "h-10 text-sm",
  lg: "h-12 text-base",
} as const;

const inputBase = [
  "flex w-full rounded-[var(--radius-md)] border border-input bg-background",
  "ring-offset-background",
  "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
  "placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      size = "md",
      prefix,
      suffix,
      clearable,
      onClear,
      shortcut,
      wrapperClassName,
      value,
      defaultValue,
      onChange,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isControlled = value !== undefined;

    // Internal value tracking — active when clearable or shortcut is used
    const [internalValue, setInternalValue] = React.useState<string>(
      typeof defaultValue === "string" || typeof defaultValue === "number"
        ? String(defaultValue)
        : "",
    );

    const currentValue = isControlled ? String(value ?? "") : internalValue;
    const showClear = !!clearable && !disabled && currentValue.length > 0;
    const shortcutDirty = !!shortcut && currentValue.length > 0;

    // Reserve right padding whenever any right adornment is configured
    const hasRightAdornment = (!!clearable && !disabled) || suffix != null || !!shortcut;
    const hasWrapper = prefix != null || suffix != null || clearable || !!shortcut;

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isControlled) setInternalValue(e.target.value);
        onChange?.(e);
      },
      [isControlled, onChange],
    );

    const handleClear = () => {
      if (!isControlled) setInternalValue("");
      const syntheticEvent = {
        target: { value: "" },
        currentTarget: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(syntheticEvent);
      onClear?.();
    };

    const sizeCls = sizeStyles[size];

    // ── Plain (backward-compatible) ─────────────────────────────────────────
    if (!hasWrapper) {
      return (
        <input
          type={type}
          className={cn(inputBase, sizeCls, "px-3 py-2", className)}
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
          {...props}
        />
      );
    }

    // ── Adorned ─────────────────────────────────────────────────────────────
    return (
      <div className={cn("relative flex items-center", wrapperClassName)}>
        {prefix != null && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 flex items-center text-muted-foreground"
          >
            {prefix}
          </span>
        )}

        <input
          type={type}
          className={cn(
            inputBase,
            sizeCls,
            "py-2",
            prefix != null ? "pl-9" : "pl-3",
            hasRightAdornment ? "pr-10" : "pr-3",
            className,
          )}
          ref={ref}
          value={clearable || shortcut ? currentValue : value}
          defaultValue={clearable || shortcut ? undefined : defaultValue}
          onChange={clearable || shortcut ? handleChange : onChange}
          disabled={disabled}
          {...props}
        />

        {/* Clear button */}
        {showClear && !shortcut && (
          <button
            type="button"
            aria-label="Clear"
            onClick={handleClear}
            className={cn(
              "absolute right-2 flex h-5 w-5 items-center justify-center rounded",
              "text-muted-foreground transition-colors",
              "hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Shortcut badge → loading spinner when dirty */}
        {shortcut && (
          <span aria-hidden className="pointer-events-none absolute right-2 flex items-center">
            {shortcutDirty ? (
              <Loader2 size={14} className="animate-spin text-muted-foreground" />
            ) : (
              <Kbd small>{shortcut}</Kbd>
            )}
          </span>
        )}

        {/* Suffix (hidden when clear or shortcut is active) */}
        {suffix != null && !showClear && !shortcut && (
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 flex items-center text-muted-foreground"
          >
            {suffix}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
