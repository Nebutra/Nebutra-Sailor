"use client";
/**
 * Checkbox — native input, painted proxy, on the semantic tokens.
 *
 * It was a copy of Geist's checkbox and kept Geist's palette: the checked box
 * was geist-gray-1000 whatever the brand, so under a Brand Package with an
 * indigo action (Stripe) the button was indigo and the checkbox black. Checked
 * and indeterminate now fill with --primary like every other "on" control
 * (toggle, slider, choicebox); unchecked is the --input border on the
 * background. The tick inherits currentColor, so it is primary-foreground on
 * the fill and transparent when unchecked.
 *
 * Native input props (aria-*, required, value, …) are forwarded; they used to
 * be dropped, and the accessible name fell back to the literal "checkbox".
 */
import React from "react";
import { cn } from "../utils/cn";
import { CheckGlyph, IndeterminateGlyph } from "./control-glyph";
import { controlFocusProxyClassName } from "./form-control";

// =============================================================================
// Types
// =============================================================================
export interface CheckboxProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "checked" | "defaultChecked" | "onChange" | "children"
  > {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  children?: React.ReactNode;
  className?: string;
}
export interface CheckboxGroupProps {
  /** Accessible group label */
  label?: string;
  /** Layout direction */
  orientation?: "vertical" | "horizontal";
  children: React.ReactNode;
  className?: string;
}

const boxClassName = (on: boolean) =>
  cn(
    "relative inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
    "stroke-current fill-none transition-[background-color,border-color,color] duration-micro",
    on
      ? "border-primary bg-primary text-primary-foreground"
      : "border-[var(--control-border)] bg-background text-transparent group-hover:border-muted-foreground",
    "peer-disabled:opacity-50",
    controlFocusProxyClassName,
  );

// =============================================================================
// Checkbox
// =============================================================================
export const Checkbox = ({
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  disabled = false,
  indeterminate = false,
  children,
  className,
  ...inputProps
}: CheckboxProps) => {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : internalChecked;
  return (
    <label
      className={cn(
        "group flex items-center text-[13px] font-sans",
        disabled ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer text-foreground",
        className,
      )}
    >
      <input
        {...inputProps}
        disabled={disabled}
        type="checkbox"
        checked={checked}
        aria-checked={indeterminate ? "mixed" : undefined}
        onChange={(e) => {
          if (indeterminate) return;
          if (!isControlled) setInternalChecked(e.target.checked);
          onChange?.(e.target.checked);
        }}
        className="peer sr-only"
      />
      <span aria-hidden="true" className={boxClassName(checked || indeterminate)}>
        {indeterminate ? <IndeterminateGlyph /> : <CheckGlyph />}
      </span>
      {children && <span className="ml-2">{children}</span>}
    </label>
  );
};
// =============================================================================
// CheckboxGroup — simple layout wrapper
// =============================================================================
export function CheckboxGroup({
  label,
  orientation = "vertical",
  children,
  className,
}: CheckboxGroupProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex",
        orientation === "vertical" ? "flex-col gap-3" : "flex-row flex-wrap gap-4",
        className,
      )}
    >
      {label && <span className="text-sm font-medium">{label}</span>}
      {children}
    </div>
  );
}
CheckboxGroup.displayName = "CheckboxGroup";
export default CheckboxGroup;
