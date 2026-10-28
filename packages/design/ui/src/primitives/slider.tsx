"use client";

import * as React from "react";
import { sliderTokens } from "../tokens/components/slider";
import { cn } from "../utils";
import { asPlainStyle } from "../utils/primitive-props";
import { rangeThumbFocusClassName } from "./form-control";

type SliderCssVar =
  | "--slider-height"
  | "--slider-track-height"
  | "--slider-thumb-size"
  | "--slider-radius"
  | "--slider-gap"
  | "--slider-label-gap"
  | "--slider-value-font-size"
  | "--slider-track-background"
  | "--slider-track-fill"
  | "--slider-thumb-background"
  | "--slider-thumb-shadow"
  | "--slider-duration"
  | "--slider-easing"
  | "--slider-progress";

type SliderCssVars = React.CSSProperties & Record<SliderCssVar, string>;

type BaseSliderProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "children" | "defaultValue" | "max" | "min" | "onChange" | "step" | "type" | "value"
> & {
  /**
   * Lower bound for the native range input and the displayed value.
   * @default 0
   */
  min?: number;
  /**
   * Upper bound for the native range input and the displayed value.
   * @default 100
   */
  max?: number;
  /**
   * Increment between values accepted by the native range input.
   * @default 1
   */
  step?: number;
  /** Visible label linked to the range input; otherwise supply `aria-label` or `aria-labelledby`. */
  label?: string;
  /** Text appended to the numeric readout, such as "%" or "px"; ignored when `formatValue` is set. */
  unit?: string;
  /**
   * Display the current formatted value beside the label.
   * @default true
   */
  showValue?: boolean;
  /** Renders the visible value readout from the clamped number; takes precedence over `unit`. */
  formatValue?: (value: number) => React.ReactNode;
  /** Classes applied to the outer label-and-control wrapper; `className` styles the range input. */
  wrapperClassName?: string;
};

type NumberSliderProps = BaseSliderProps & {
  /** Use scalar values and callbacks; this mode is inferred when no array-valued props are supplied. */
  valueMode?: "number";
  /** Controlled scalar value, clamped to the configured bounds for display and interaction. */
  value?: number;
  /** Initial uncontrolled value; falls back to `min` when omitted. */
  defaultValue?: number;
  /** Receives the numeric value for each native input change. */
  onValueChange?: (value: number) => void;
  /** Receives the numeric value on pointer release or after releasing a supported range-navigation key. */
  onValueCommit?: (value: number) => void;
};

type ArraySliderProps = BaseSliderProps & {
  /** Array compatibility mode, also inferred from array values; only one thumb is rendered. */
  valueMode?: "array";
  /** Controlled array value; only the first entry is used by the single range input. */
  value?: readonly number[];
  /** Initial uncontrolled value from the first entry; an empty array falls back to `min`. */
  defaultValue?: readonly number[];
  /** Receives a single-element array on each native input change. */
  onValueChange?: (value: number[]) => void;
  /** Receives a single-element array on pointer release or supported navigation-key release. */
  onValueCommit?: (value: number[]) => void;
};

export type SliderProps = NumberSliderProps | ArraySliderProps;

function isArraySliderProps(props: SliderProps): props is ArraySliderProps {
  return (
    props.valueMode === "array" || Array.isArray(props.value) || Array.isArray(props.defaultValue)
  );
}

function normalizeSliderValue(value: number | readonly number[] | undefined, fallback: number) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getProgress(value: number, min: number, max: number) {
  if (max <= min) {
    return 0;
  }

  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

function getSliderStyle(progress: number, style: unknown): SliderCssVars {
  return {
    "--slider-height": `${sliderTokens.height}px`,
    "--slider-track-height": `${sliderTokens.trackHeight}px`,
    "--slider-thumb-size": `${sliderTokens.thumbSize}px`,
    "--slider-radius": `${sliderTokens.radius}px`,
    "--slider-gap": `${sliderTokens.gap}px`,
    "--slider-label-gap": `${sliderTokens.labelGap}px`,
    "--slider-value-font-size": `${sliderTokens.valueFontSize}px`,
    "--slider-track-background": sliderTokens.track.background,
    "--slider-track-fill": sliderTokens.track.fill,
    "--slider-thumb-background": sliderTokens.thumb.background,
    "--slider-thumb-shadow": sliderTokens.thumb.shadow,
    "--slider-duration": `${sliderTokens.motion.duration}ms`,
    "--slider-easing": sliderTokens.motion.easing,
    "--slider-progress": `${progress}%`,
    ...asPlainStyle(style),
  };
}

function formatSliderValue(value: number, unit: string | undefined) {
  return unit ? `${value}${unit}` : value;
}

/**
 * Single-thumb native range control with a label and optional formatted value readout.
 * Accepts scalar or array-compatible values; array mode uses only the first value and emits one entry.
 */
export const Slider = ({
  ref,
  ...props
}: SliderProps & { ref?: React.Ref<HTMLInputElement> | undefined }) => {
  const {
    className,
    wrapperClassName,
    min = 0,
    max = 100,
    step = 1,
    label,
    unit,
    showValue = true,
    formatValue,
    style,
    id,
    value,
    defaultValue,
    disabled,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    onBlur,
    onPointerUp,
    onKeyUp,
    // Slider's own callbacks + discriminant — pull them out so they are NOT
    // spread onto the native <input> below (React warns "Unknown event handler
    // property onValueChange"). The emit helpers still read props.onValueChange.
    onValueChange: _onValueChange,
    onValueCommit: _onValueCommit,
    valueMode: _valueMode,
    ...inputProps
  } = props;
  const generatedId = React.useId();
  const sliderId = id ?? generatedId;
  const [internalValue, setInternalValue] = React.useState(() =>
    normalizeSliderValue(defaultValue, min),
  );
  const currentValue = clamp(normalizeSliderValue(value, internalValue), min, max);
  const progress = getProgress(currentValue, min, max);
  const valueContent = formatValue
    ? formatValue(currentValue)
    : formatSliderValue(currentValue, unit);
  const hasAccessibleName = Boolean(label || ariaLabel || ariaLabelledBy);

  function emitValueChange(nextValue: number) {
    if (isArraySliderProps(props)) {
      props.onValueChange?.([nextValue]);
      return;
    }

    props.onValueChange?.(nextValue);
  }

  function emitValueCommit(nextValue: number) {
    if (isArraySliderProps(props)) {
      props.onValueCommit?.([nextValue]);
      return;
    }

    props.onValueCommit?.(nextValue);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = Number(event.currentTarget.value);

    if (value === undefined) {
      setInternalValue(nextValue);
    }

    emitValueChange(nextValue);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLInputElement>) {
    onPointerUp?.(event);
    emitValueCommit(Number(event.currentTarget.value));
  }

  function handleKeyUp(event: React.KeyboardEvent<HTMLInputElement>) {
    onKeyUp?.(event);

    if (
      [
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "End",
        "Home",
        "PageDown",
        "PageUp",
      ].includes(event.key)
    ) {
      emitValueCommit(Number(event.currentTarget.value));
    }
  }

  return (
    <div
      className={cn("grid w-full gap-[var(--slider-gap)]", wrapperClassName)}
      style={getSliderStyle(progress, style)}
    >
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-[var(--slider-label-gap)]">
          {label ? (
            <label className="font-medium text-foreground text-sm" htmlFor={sliderId}>
              {label}
            </label>
          ) : (
            <span aria-hidden="true" />
          )}
          {showValue ? (
            <span className="text-[length:var(--slider-value-font-size)] text-muted-foreground tabular-nums">
              {valueContent}
            </span>
          ) : null}
        </div>
      )}
      <input
        ref={ref}
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        disabled={disabled}
        aria-label={hasAccessibleName ? ariaLabel : "Slider value"}
        aria-labelledby={ariaLabelledBy}
        onChange={handleChange}
        onPointerUp={handlePointerUp}
        onKeyUp={handleKeyUp}
        onBlur={onBlur}
        className={cn(
          "h-[var(--slider-height)] w-full cursor-pointer appearance-none rounded-[var(--slider-radius)] bg-[linear-gradient(to_right,var(--slider-track-fill)_0,var(--slider-track-fill)_var(--slider-progress),var(--slider-track-background)_var(--slider-progress),var(--slider-track-background)_100%)] rtl:bg-[linear-gradient(to_left,var(--slider-track-fill)_0,var(--slider-track-fill)_var(--slider-progress),var(--slider-track-background)_var(--slider-progress),var(--slider-track-background)_100%)] bg-[length:100%_var(--slider-track-height)] bg-center bg-no-repeat outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          rangeThumbFocusClassName,
          "[&::-moz-range-thumb]:size-[var(--slider-thumb-size)] [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border [&::-moz-range-thumb]:bg-[var(--slider-thumb-background)] [&::-moz-range-thumb]:shadow-[var(--slider-thumb-shadow)]",
          "[&::-webkit-slider-thumb]:size-[var(--slider-thumb-size)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border [&::-webkit-slider-thumb]:bg-[var(--slider-thumb-background)] [&::-webkit-slider-thumb]:shadow-[var(--slider-thumb-shadow)]",
          "[&::-moz-range-thumb]:transition-[box-shadow,transform] [&::-moz-range-thumb]:duration-[var(--slider-duration)] [&::-moz-range-thumb]:ease-[var(--slider-easing)]",
          "[&::-webkit-slider-thumb]:transition-[box-shadow,transform] [&::-webkit-slider-thumb]:duration-[var(--slider-duration)] [&::-webkit-slider-thumb]:ease-[var(--slider-easing)]",
          "active:[&::-moz-range-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-110 motion-reduce:[&::-moz-range-thumb]:transition-none motion-reduce:[&::-webkit-slider-thumb]:transition-none",
          className,
        )}
        {...inputProps}
      />
    </div>
  );
};

Slider.displayName = "Slider";
export default Slider;
