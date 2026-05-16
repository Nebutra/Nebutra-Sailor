"use client";

import * as React from "react";

import { sliderTokens } from "../tokens/components/slider";
import { cn } from "../utils";

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
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  showValue?: boolean;
  formatValue?: (value: number) => React.ReactNode;
  wrapperClassName?: string;
};

type NumberSliderProps = BaseSliderProps & {
  valueMode?: "number";
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onValueCommit?: (value: number) => void;
};

type ArraySliderProps = BaseSliderProps & {
  valueMode?: "array";
  value?: readonly number[];
  defaultValue?: readonly number[];
  onValueChange?: (value: number[]) => void;
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

function getSliderStyle(progress: number, style: React.CSSProperties | undefined): SliderCssVars {
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
    ...style,
  };
}

function formatSliderValue(value: number, unit: string | undefined) {
  return unit ? `${value}${unit}` : value;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>((props, ref) => {
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
          "h-[var(--slider-height)] w-full cursor-pointer appearance-none rounded-[var(--slider-radius)] bg-[linear-gradient(to_right,var(--slider-track-fill)_0,var(--slider-track-fill)_var(--slider-progress),var(--slider-track-background)_var(--slider-progress),var(--slider-track-background)_100%)] bg-[length:100%_var(--slider-track-height)] bg-center bg-no-repeat outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          "[&::-moz-range-thumb]:size-[var(--slider-thumb-size)] [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border [&::-moz-range-thumb]:bg-[var(--slider-thumb-background)] [&::-moz-range-thumb]:shadow-[var(--slider-thumb-shadow)]",
          "[&::-webkit-slider-thumb]:size-[var(--slider-thumb-size)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border [&::-webkit-slider-thumb]:bg-[var(--slider-thumb-background)] [&::-webkit-slider-thumb]:shadow-[var(--slider-thumb-shadow)]",
          "[&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-[var(--slider-duration)] [&::-moz-range-thumb]:ease-[var(--slider-easing)]",
          "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-[var(--slider-duration)] [&::-webkit-slider-thumb]:ease-[var(--slider-easing)]",
          "active:[&::-moz-range-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-110 motion-reduce:[&::-moz-range-thumb]:transition-none motion-reduce:[&::-webkit-slider-thumb]:transition-none",
          className,
        )}
        {...inputProps}
      />
    </div>
  );
});

Slider.displayName = "Slider";
export default Slider;
