"use client";

import * as React from "react";
import {
  type ControlStep,
  controlFontSize,
  controlHeight,
} from "../tokens/components/control-ladder";
import { type SwitchSize, switchSizes, switchTokens } from "../tokens/components/switch";
import { cn } from "../utils/cn";
import { asPlainStyle } from "../utils/primitive-props";
import { controlFocusProxyClassName } from "./form-control";

type SwitchCssVar =
  | "--switch-height"
  | "--switch-control-height"
  | "--switch-control-min-width"
  | "--switch-control-padding-x"
  | "--switch-icon-size"
  | "--switch-font-size"
  | "--switch-padding"
  | "--switch-gap"
  | "--switch-radius"
  | "--switch-control-radius"
  | "--switch-duration"
  | "--switch-easing";

type SwitchCssVars = React.CSSProperties & Record<SwitchCssVar, string>;

type SwitchContextValue = {
  defaultValue: string | undefined;
  disabled: boolean | undefined;
  name: string;
  onValueChange: ((value: string) => void) | undefined;
  size: SwitchSize;
  value: string | undefined;
};

const SwitchContext = React.createContext<SwitchContextValue | null>(null);

function useSwitchContext() {
  const context = React.use(SwitchContext);

  if (!context) {
    throw new Error("Switch.Control must be rendered inside Switch.");
  }

  return context;
}

export interface SwitchProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "children" | "defaultValue" | "onChange"> {
  /** Switch.Control segments sharing one radio group. */
  children?: React.ReactNode;
  /** Initially selected segment value when selection is uncontrolled. */
  defaultValue?: string;
  /** Default disabled state inherited by segments unless a segment overrides it. */
  disabled?: boolean;
  /** Shared radio input name; a unique name is generated when omitted. */
  name?: string;
  /** Called with the selected segment's value after its uncanceled change event. */
  onValueChange?: (value: string) => void;
  /**
   * Size of the track and its segments.
   * @default "medium"
   */
  size?: SwitchSize;
  /** Controlled selected segment value. */
  value?: string;
}

const SWITCH_STEP: Record<SwitchSize, ControlStep> = { small: "sm", medium: "md", large: "lg" };

/** Segment height: the control-ladder step, less the track's inset on both sides. */
function segmentHeight(size: SwitchSize): string {
  const t = switchSizes[size];
  return `calc(${controlHeight(SWITCH_STEP[size], t.height)} - ${t.padding * 2}px)`;
}

function getSwitchStyle(size: SwitchSize, style: unknown) {
  const sizeTokens = switchSizes[size];

  return {
    "--switch-height": controlHeight(SWITCH_STEP[size], sizeTokens.height),
    "--switch-control-height": segmentHeight(size),
    "--switch-control-min-width": `${sizeTokens.minWidth}px`,
    "--switch-control-padding-x": `${sizeTokens.paddingX}px`,
    "--switch-icon-size": `${sizeTokens.iconSize}px`,
    "--switch-font-size": controlFontSize(SWITCH_STEP[size], sizeTokens.fontSize),
    "--switch-padding": `${sizeTokens.padding}px`,
    "--switch-gap": `${switchTokens.gap}px`,
    // Concentric, and on the language's control corner rather than a fixed 8/6.
    "--switch-radius": `calc(var(--radius-md, ${switchTokens.controlRadius}px) + ${sizeTokens.padding}px)`,
    "--switch-control-radius": `var(--radius-md, ${switchTokens.controlRadius}px)`,
    "--switch-duration": `${switchTokens.motion.duration}ms`,
    "--switch-easing": switchTokens.motion.easing,
    ...asPlainStyle(style),
  } satisfies SwitchCssVars;
}

function getSwitchControlStyle(size: SwitchSize, style: unknown) {
  const sizeTokens = switchSizes[size];

  return {
    "--switch-control-height": segmentHeight(size),
    "--switch-control-min-width": `${sizeTokens.minWidth}px`,
    "--switch-control-padding-x": `${sizeTokens.paddingX}px`,
    "--switch-icon-size": `${sizeTokens.iconSize}px`,
    "--switch-font-size": controlFontSize(SWITCH_STEP[size], sizeTokens.fontSize),
    ...asPlainStyle(style),
  } satisfies Pick<
    SwitchCssVars,
    | "--switch-control-height"
    | "--switch-control-min-width"
    | "--switch-control-padding-x"
    | "--switch-icon-size"
    | "--switch-font-size"
  >;
}

/** Groups mutually exclusive radio segments with shared selection, size, and disabled state. */
const SwitchRoot = function SwitchRoot({
  children,
  name,
  size = "medium",
  defaultValue,
  value,
  disabled,
  onValueChange,
  style,
  className,
  ref,
  ...props
}: SwitchProps & { ref?: React.Ref<HTMLDivElement> | undefined }) {
  const generatedName = React.useId();
  const resolvedName = name ?? generatedName;
  const context = React.useMemo<SwitchContextValue>(
    () => ({
      defaultValue,
      disabled,
      name: resolvedName,
      onValueChange,
      size,
      value,
    }),
    [defaultValue, disabled, onValueChange, resolvedName, size, value],
  );

  return (
    <SwitchContext.Provider value={context}>
      <div
        ref={ref}
        data-slot="switch"
        role="radiogroup"
        className={cn(
          "inline-flex h-[var(--switch-height)] items-center gap-[var(--switch-gap)] rounded-[var(--switch-radius)] border border-border bg-muted p-[calc(var(--switch-padding)-1px)] text-muted-foreground",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
        style={getSwitchStyle(size, style)}
        {...props}
      >
        {children}
      </div>
    </SwitchContext.Provider>
  );
};

export interface SwitchControlProps
  extends Omit<React.LabelHTMLAttributes<HTMLLabelElement>, "children" | "onChange"> {
  /** Controls this segment's checked state, taking precedence over the group's value. */
  checked?: boolean;
  /** Initial checked state for an uncontrolled segment, overriding the group's defaultValue. */
  defaultChecked?: boolean;
  /** Overrides the group's disabled state for this segment. */
  disabled?: boolean;
  /** Visual shown in place of the text label; the accessible label remains available. */
  icon?: React.ReactNode;
  /** Visible text and accessible name; falls back to value. */
  label?: string;
  /** Overrides the group's shared radio input name for this segment. */
  name?: string;
  /** Native radio change handler; preventDefault stops the group's onValueChange callback. */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Overrides the group's size for this segment. */
  size?: SwitchSize;
  /** Unique radio value identifying this segment within the group. */
  value: string;
}

/** Selectable radio segment with a text or icon label; render inside Switch. */
const SwitchControl = function SwitchControl({
  checked,
  className,
  defaultChecked,
  disabled,
  icon,
  label,
  name,
  onChange,
  size,
  style,
  value,
  ref,
  ...props
}: SwitchControlProps & { ref?: React.Ref<HTMLLabelElement> | undefined }) {
  const context = useSwitchContext();
  const resolvedSize = size ?? context.size;
  const isControlled = checked !== undefined || context.value !== undefined;
  const isChecked = checked ?? (context.value !== undefined ? context.value === value : undefined);
  const isDefaultChecked =
    !isControlled &&
    (defaultChecked ?? (context.defaultValue !== undefined && context.defaultValue === value));
  const isDisabled = disabled ?? context.disabled;
  const accessibleLabel = label ?? value;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange?.(event);

    if (!event.defaultPrevented) {
      context.onValueChange?.(event.currentTarget.value);
    }
  }

  return (
    <label
      ref={ref}
      data-slot="switch-control"
      data-size={resolvedSize}
      className={cn(
        "relative isolate flex h-[var(--switch-control-height)] min-w-[var(--switch-control-min-width)] flex-1 cursor-pointer items-center",
        isDisabled && "cursor-not-allowed",
        className,
      )}
      style={getSwitchControlStyle(resolvedSize, style)}
      {...props}
    >
      <input
        type="radio"
        name={name ?? context.name}
        value={value}
        checked={isControlled ? isChecked : undefined}
        defaultChecked={isControlled ? undefined : isDefaultChecked}
        disabled={isDisabled}
        aria-label={accessibleLabel}
        className="peer sr-only"
        onChange={handleChange}
      />
      <span
        aria-hidden={icon ? true : undefined}
        className={cn(
          "inline-flex h-full w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--switch-control-radius)] px-[var(--switch-control-padding-x)] font-medium text-[length:var(--switch-font-size)]",
          "text-muted-foreground transition-[background-color,box-shadow,color] duration-[var(--switch-duration)] ease-[var(--switch-easing)]",
          "peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm",
          controlFocusProxyClassName,
          "",
          "peer-disabled:pointer-events-none peer-disabled:text-muted-foreground/60",
          "[&_svg]:size-[var(--switch-icon-size)]",
        )}
      >
        {icon ? (
          <>
            {icon}
            <span className="sr-only">{accessibleLabel}</span>
          </>
        ) : (
          accessibleLabel
        )}
      </span>
    </label>
  );
};

SwitchRoot.displayName = "Switch";
SwitchControl.displayName = "Switch.Control";

/** Segmented single-choice selector built from native radio inputs and Switch.Control parts. */
export const Switch = Object.assign(SwitchRoot, {
  /** Selectable radio segment that inherits the group's selection and sizing. */
  Control: SwitchControl,
});
