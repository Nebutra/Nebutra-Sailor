"use client";

import { DeviceDesktop as Monitor, Moon, Sun } from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import * as React from "react";

import {
  type ThemeSwitcherSize,
  themeSwitcherSizes,
  themeSwitcherTokens,
} from "../tokens/components/theme-switcher";
import { cn } from "../utils/cn";

export type ThemeSwitcherValue = "system" | "light" | "dark";

type ThemeSwitcherCssVar =
  | "--theme-switcher-height"
  | "--theme-switcher-padding"
  | "--theme-switcher-gap"
  | "--theme-switcher-option-min-width"
  | "--theme-switcher-option-padding-x"
  | "--theme-switcher-icon-size"
  | "--theme-switcher-font-size"
  | "--theme-switcher-radius"
  | "--theme-switcher-option-radius"
  | "--theme-switcher-label-gap"
  | "--theme-switcher-focus-ring-width"
  | "--theme-switcher-focus-ring-offset"
  | "--theme-switcher-duration"
  | "--theme-switcher-easing";

type ThemeSwitcherCssVars = React.CSSProperties & Record<ThemeSwitcherCssVar, string>;

type ThemeSwitcherOption = {
  icon: React.ComponentType<{ "aria-hidden"?: boolean; className?: string }>;
  label: ThemeSwitcherValue;
  value: ThemeSwitcherValue;
};

const THEME_OPTIONS = [
  { value: "system", label: "system", icon: Monitor },
  { value: "light", label: "light", icon: Sun },
  { value: "dark", label: "dark", icon: Moon },
] as const satisfies readonly ThemeSwitcherOption[];

export interface ThemeSwitcherProps
  extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "defaultValue" | "onChange"> {
  /** Controlled compatibility value. Prefer the app-level ThemeProvider state. */
  value?: ThemeSwitcherValue;
  /** Initial fallback when rendered outside ThemeProvider. */
  defaultValue?: ThemeSwitcherValue;
  /** Compatibility callback for tests or migrations. ThemeProvider remains the source of truth. */
  onChange?: (theme: ThemeSwitcherValue) => void;
  /** Read-only preview state. Provider `forcedTheme` also disables the control. */
  disabled?: boolean;
  /** Compact size for dense chrome. */
  size?: ThemeSwitcherSize;
  /** Form control name when participating in a native form. */
  name?: string;
}

function getThemeSwitcherStyle(
  size: ThemeSwitcherSize,
  style: React.CSSProperties | undefined,
): ThemeSwitcherCssVars {
  const token = themeSwitcherSizes[size];

  return {
    "--theme-switcher-height": `${token.controlHeight}px`,
    "--theme-switcher-padding": `${token.padding}px`,
    "--theme-switcher-gap": `${token.gap}px`,
    "--theme-switcher-option-min-width": `${token.optionMinWidth}px`,
    "--theme-switcher-option-padding-x": `${token.optionPaddingX}px`,
    "--theme-switcher-icon-size": `${token.iconSize}px`,
    "--theme-switcher-font-size": `${token.fontSize}px`,
    "--theme-switcher-radius": `${themeSwitcherTokens.radius}px`,
    "--theme-switcher-option-radius": `${themeSwitcherTokens.optionRadius}px`,
    "--theme-switcher-label-gap": `${themeSwitcherTokens.labelGap}px`,
    "--theme-switcher-focus-ring-width": `${themeSwitcherTokens.focusRingWidth}px`,
    "--theme-switcher-focus-ring-offset": `${themeSwitcherTokens.focusRingOffset}px`,
    "--theme-switcher-duration": `${themeSwitcherTokens.motion.duration}ms`,
    "--theme-switcher-easing": themeSwitcherTokens.motion.easing,
    ...style,
  };
}

function isThemeSwitcherValue(value: string | undefined): value is ThemeSwitcherValue {
  return value === "system" || value === "light" || value === "dark";
}

export const ThemeSwitcher = React.forwardRef<HTMLFieldSetElement, ThemeSwitcherProps>(
  (
    {
      value,
      defaultValue = "system",
      onChange,
      disabled = false,
      size = "medium",
      name,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const generatedName = React.useId();
    const radioName = name ?? generatedName;
    const { isProviderBound, theme, forcedTheme, setTheme } = useTheme();
    const [fallbackValue, setFallbackValue] = React.useState<ThemeSwitcherValue>(defaultValue);
    const providerTheme = isThemeSwitcherValue(theme) ? theme : "system";
    const selectedTheme = forcedTheme ?? value ?? (isProviderBound ? providerTheme : fallbackValue);
    const isReadOnly = disabled || forcedTheme !== undefined;

    function handleChange(nextTheme: ThemeSwitcherValue) {
      if (isReadOnly) return;
      setFallbackValue(nextTheme);
      setTheme(nextTheme);
      onChange?.(nextTheme);
    }

    return (
      <fieldset
        ref={ref}
        aria-disabled={isReadOnly}
        className={cn("inline-grid gap-[var(--theme-switcher-label-gap)]", className)}
        disabled={isReadOnly}
        style={getThemeSwitcherStyle(size, style)}
        {...props}
      >
        <legend className="text-[length:var(--theme-switcher-font-size)] font-medium text-foreground">
          Select a display theme:
        </legend>
        <div className="inline-flex h-[var(--theme-switcher-height)] items-center gap-[var(--theme-switcher-gap)] rounded-[var(--theme-switcher-radius)] border border-border bg-muted p-[var(--theme-switcher-padding)] text-muted-foreground">
          {THEME_OPTIONS.map(({ value: optionValue, label, icon: Icon }) => {
            const checked = selectedTheme === optionValue;

            return (
              <label
                key={optionValue}
                className={cn(
                  "relative inline-flex h-full min-w-[var(--theme-switcher-option-min-width)] cursor-pointer items-center justify-center gap-[var(--theme-switcher-gap)] rounded-[var(--theme-switcher-option-radius)] px-[var(--theme-switcher-option-padding-x)] text-[length:var(--theme-switcher-font-size)] font-medium transition-[background-color,box-shadow,color,opacity] duration-[var(--theme-switcher-duration)] ease-[var(--theme-switcher-easing)]",
                  "hover:text-foreground has-[:focus-visible]:ring-[length:var(--theme-switcher-focus-ring-width)] has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-[length:var(--theme-switcher-focus-ring-offset)] has-[:focus-visible]:ring-offset-background",
                  checked && "bg-background text-foreground shadow-[var(--shadow-xs)]",
                  isReadOnly && "cursor-not-allowed opacity-60",
                )}
              >
                <input
                  aria-label={label}
                  checked={checked}
                  className="sr-only"
                  disabled={isReadOnly}
                  name={radioName}
                  onChange={() => handleChange(optionValue)}
                  type="radio"
                  value={optionValue}
                />
                <Icon aria-hidden className="size-[var(--theme-switcher-icon-size)] shrink-0" />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  },
);

ThemeSwitcher.displayName = "ThemeSwitcher";
