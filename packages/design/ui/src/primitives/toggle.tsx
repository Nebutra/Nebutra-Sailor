"use client";

import * as React from "react";
import {
  type ToggleColor,
  type ToggleSize,
  toggleColorAliases,
  toggleTokens,
} from "../tokens/components/toggle";
import { cn } from "../utils";

export type ToggleDirection = "label-first" | "switch-first" | "switch-last";
export type ToggleLabelCasing = "title" | "normal";
export type ToggleChangeHandler = (
  checked: boolean,
  event: React.ChangeEvent<HTMLInputElement>,
) => void;

type ToggleCssVar =
  | "--toggle-track-width"
  | "--toggle-track-height"
  | "--toggle-thumb-size"
  | "--toggle-thumb-translate"
  | "--toggle-icon-size"
  | "--toggle-label-font-size"
  | "--toggle-padding-y"
  | "--toggle-gap"
  | "--toggle-radius"
  | "--toggle-thumb-shadow"
  | "--toggle-duration"
  | "--toggle-easing"
  | "--toggle-track-on"
  | "--toggle-track-off"
  | "--toggle-track-border"
  | "--toggle-thumb"
  | "--toggle-icon-on"
  | "--toggle-icon-off";

type ToggleCssVars = React.CSSProperties & Record<ToggleCssVar, string>;

export interface ToggleProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "children" | "color" | "onChange" | "size" | "type"
  > {
  children?: React.ReactNode;
  className?: string;
  color?: ToggleColor;
  direction?: ToggleDirection;
  icon?: {
    checked?: React.ReactNode;
    unchecked?: React.ReactNode;
  };
  labelCasing?: ToggleLabelCasing;
  onChange?: ToggleChangeHandler;
  onCheckedChange?: ToggleChangeHandler;
  size?: ToggleSize;
}

function getColorToken(color: ToggleColor) {
  const resolvedColor =
    color in toggleColorAliases
      ? toggleColorAliases[color as keyof typeof toggleColorAliases]
      : color;

  return toggleTokens.color[resolvedColor as keyof typeof toggleTokens.color];
}

function getToggleStyle(
  size: ToggleSize,
  color: ToggleColor,
  style: React.CSSProperties | undefined,
) {
  const sizeTokens = toggleTokens.size[size];
  const colorTokens = getColorToken(color);

  return {
    "--toggle-track-width": `${sizeTokens.trackWidth}px`,
    "--toggle-track-height": `${sizeTokens.trackHeight}px`,
    "--toggle-thumb-size": `${sizeTokens.thumbSize}px`,
    "--toggle-thumb-translate": `${sizeTokens.thumbTranslate}px`,
    "--toggle-icon-size": `${sizeTokens.iconSize}px`,
    "--toggle-label-font-size": `${sizeTokens.labelFontSize}px`,
    "--toggle-padding-y": `${sizeTokens.paddingY}px`,
    "--toggle-gap": `${sizeTokens.gap}px`,
    "--toggle-radius": `${toggleTokens.radius}px`,
    "--toggle-thumb-shadow": toggleTokens.thumbShadow,
    "--toggle-duration": `${toggleTokens.motion.duration}ms`,
    "--toggle-easing": toggleTokens.motion.easing,
    "--toggle-track-on": colorTokens.trackOn,
    "--toggle-track-off": colorTokens.trackOff,
    "--toggle-track-border": colorTokens.trackBorder,
    "--toggle-thumb": colorTokens.thumb,
    "--toggle-icon-on": colorTokens.iconOn,
    "--toggle-icon-off": colorTokens.iconOff,
    ...style,
  } satisfies ToggleCssVars;
}

const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  (
    {
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      checked: checkedProp,
      children,
      className,
      color = "default",
      defaultChecked = false,
      direction = "label-first",
      disabled,
      icon,
      id,
      labelCasing = "title",
      onChange,
      onCheckedChange,
      size = "small",
      style,
      ...inputProps
    },
    ref,
  ) => {
    const isControlled = checkedProp !== undefined;
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const checked = isControlled ? checkedProp : internalChecked;
    const hasVisibleLabel = children != null;
    const visualDirection = direction === "switch-last" ? "label-first" : direction;

    React.useEffect(() => {
      if (
        process.env.NODE_ENV !== "production" &&
        !hasVisibleLabel &&
        ariaLabel === undefined &&
        ariaLabelledBy === undefined
      ) {
        globalThis.console.warn(
          "Toggle requires an accessible name. Pass children, aria-label, or aria-labelledby.",
        );
      }
    }, [ariaLabel, ariaLabelledBy, hasVisibleLabel]);

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
      const nextChecked = event.currentTarget.checked;

      if (!isControlled) {
        setInternalChecked(nextChecked);
      }

      onCheckedChange?.(nextChecked, event);
      onChange?.(nextChecked, event);
    }

    const accessibilityProps = {
      ...(hasVisibleLabel || ariaLabel === undefined ? {} : { "aria-label": ariaLabel }),
      ...(ariaLabelledBy === undefined ? {} : { "aria-labelledby": ariaLabelledBy }),
    };
    const checkedProps = isControlled ? { checked } : { defaultChecked };

    const control = (
      <label className="relative inline-flex shrink-0" htmlFor={inputId}>
        <input
          ref={ref}
          className="peer sr-only"
          disabled={disabled}
          id={inputId}
          onChange={handleChange}
          type="checkbox"
          {...accessibilityProps}
          {...checkedProps}
          {...inputProps}
        />
        <span
          aria-hidden="true"
          className={cn(
            "relative inline-flex h-[var(--toggle-track-height)] w-[var(--toggle-track-width)] items-center rounded-[var(--toggle-radius)] border bg-[var(--toggle-track-off)] p-px",
            "border-[var(--toggle-track-border)] transition-[background-color,border-color] duration-[var(--toggle-duration)] ease-[var(--toggle-easing)]",
            "peer-checked:bg-[var(--toggle-track-on)]",
            "peer-checked:[&>span]:translate-x-[var(--toggle-thumb-translate)] peer-checked:[&>span]:text-[var(--toggle-icon-on)]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
            "motion-reduce:transition-none",
          )}
        >
          <span
            className={cn(
              "flex size-[var(--toggle-thumb-size)] translate-x-0 items-center justify-center rounded-[var(--toggle-radius)] bg-[var(--toggle-thumb)] shadow-[var(--toggle-thumb-shadow)]",
              "text-[var(--toggle-icon-off)] transition-[color,transform] duration-[var(--toggle-duration)] ease-[var(--toggle-easing)]",
              "motion-reduce:transition-none [&_svg]:size-[var(--toggle-icon-size)]",
            )}
          >
            {icon != null && (
              <span className="inline-flex">{checked ? icon.checked : icon.unchecked}</span>
            )}
          </span>
        </span>
      </label>
    );

    const label = hasVisibleLabel ? (
      <label
        data-label-casing={labelCasing}
        htmlFor={inputId}
        className={cn(
          "select-none font-medium text-[length:var(--toggle-label-font-size)] text-muted-foreground leading-none",
        )}
      >
        {children}
      </label>
    ) : null;

    return (
      <span
        className={cn(
          "inline-flex items-center gap-[var(--toggle-gap)] py-[var(--toggle-padding-y)]",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          className,
        )}
        style={getToggleStyle(size, color, style)}
      >
        {visualDirection === "label-first" && label}
        {control}
        {visualDirection === "switch-first" && label}
      </span>
    );
  },
);

Toggle.displayName = "Toggle";

export { Toggle };
