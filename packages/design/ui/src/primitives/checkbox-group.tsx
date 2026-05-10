"use client";
/**
 * Checkbox — 21st.dev Geist implementation
 * Source: https://21st.dev / Geist Design System
 *
 * Uses --ds-gray-* / --ds-background-* CSS variables (registered in globals.css)
 * mapped to Tailwind via `geist-gray-*` / `geist-background-*` theme colors.
 */
import React from "react";
import { cn } from "../utils/cn";
// =============================================================================
// Types
// =============================================================================
export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  name?: string;
}
export interface CheckboxGroupProps {
  /** Accessible group label */
  label?: string;
  /** Layout direction */
  orientation?: "vertical" | "horizontal";
  children: React.ReactNode;
  className?: string;
}
// =============================================================================
// Checkbox indicator styles (Geist DS color logic)
// =============================================================================
const getInputClasses = (checked: boolean, disabled: boolean, indeterminate: boolean) => {
  let className =
    "relative border w-4 h-4 duration-200 rounded inline-flex items-center justify-center";
  if (disabled) {
    if (!checked || indeterminate) {
      className += " bg-geist-gray-100 border-geist-gray-500";
      className += indeterminate
        ? " stroke-geist-gray-500"
        : " fill-geist-gray-100 stroke-geist-gray-100";
    } else {
      className +=
        " bg-geist-gray-600 border-geist-gray-600 fill-geist-gray-600 stroke-geist-gray-100";
    }
  } else {
    if (!checked || indeterminate) {
      className += " bg-geist-background-100 border-geist-gray-700 group-hover:bg-geist-gray-200";
      className += indeterminate
        ? " stroke-geist-gray-700"
        : " fill-geist-background-100 stroke-geist-background-100 group-hover:stroke-geist-gray-200 group-hover:fill-geist-gray-200";
    } else {
      className +=
        " bg-geist-gray-1000 border-geist-gray-1000 fill-geist-gray-1000 stroke-geist-gray-100";
    }
  }
  return className;
};
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
  id,
  name,
}: CheckboxProps) => {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : internalChecked;
  return (
    <label
      className={cn(
        "flex items-center text-[13px] font-sans group",
        disabled ? "text-geist-gray-500 cursor-not-allowed" : "text-geist-gray-1000 cursor-pointer",
        className,
      )}
    >
      <input
        id={id}
        name={name}
        disabled={disabled}
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          if (!indeterminate) {
            if (!isControlled) {
              setInternalChecked(e.target.checked);
            }
            if (onChange) {
              onChange(e.target.checked);
            }
          }
        }}
        aria-label={typeof children === "string" ? children : "checkbox"}
        className="sr-only"
      />
      <span className={getInputClasses(checked, disabled, indeterminate)}>
        <svg aria-hidden="true" className="shrink-0" height="16" viewBox="0 0 20 20" width="16">
          {indeterminate ? (
            <line
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              x1="5"
              x2="15"
              y1="10"
              y2="10"
            />
          ) : (
            <path
              d="M14 7L8.5 12.5L6 10"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          )}
        </svg>
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
