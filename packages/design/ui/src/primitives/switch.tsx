"use client";

import * as React from "react";

import { type SwitchSize, switchSizes, switchTokens } from "../tokens/components/switch";
import { cn } from "../utils/cn";

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
  const context = React.useContext(SwitchContext);

  if (!context) {
    throw new Error("Switch.Control must be rendered inside Switch.");
  }

  return context;
}

export interface SwitchProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "children" | "defaultValue" | "onChange"> {
  children?: React.ReactNode;
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
  onValueChange?: (value: string) => void;
  size?: SwitchSize;
  value?: string;
}

function getSwitchStyle(size: SwitchSize, style: React.CSSProperties | undefined) {
  const sizeTokens = switchSizes[size];

  return {
    "--switch-height": `${sizeTokens.height}px`,
    "--switch-control-height": `${sizeTokens.controlHeight}px`,
    "--switch-control-min-width": `${sizeTokens.minWidth}px`,
    "--switch-control-padding-x": `${sizeTokens.paddingX}px`,
    "--switch-icon-size": `${sizeTokens.iconSize}px`,
    "--switch-font-size": `${sizeTokens.fontSize}px`,
    "--switch-padding": `${sizeTokens.padding}px`,
    "--switch-gap": `${switchTokens.gap}px`,
    "--switch-radius": `${switchTokens.radius}px`,
    "--switch-control-radius": `${switchTokens.controlRadius}px`,
    "--switch-duration": `${switchTokens.motion.duration}ms`,
    "--switch-easing": switchTokens.motion.easing,
    ...style,
  } satisfies SwitchCssVars;
}

function getSwitchControlStyle(size: SwitchSize, style: React.CSSProperties | undefined) {
  const sizeTokens = switchSizes[size];

  return {
    "--switch-control-height": `${sizeTokens.controlHeight}px`,
    "--switch-control-min-width": `${sizeTokens.minWidth}px`,
    "--switch-control-padding-x": `${sizeTokens.paddingX}px`,
    "--switch-icon-size": `${sizeTokens.iconSize}px`,
    "--switch-font-size": `${sizeTokens.fontSize}px`,
    ...style,
  } satisfies Pick<
    SwitchCssVars,
    | "--switch-control-height"
    | "--switch-control-min-width"
    | "--switch-control-padding-x"
    | "--switch-icon-size"
    | "--switch-font-size"
  >;
}

const SwitchRoot = React.forwardRef<HTMLDivElement, SwitchProps>(function SwitchRoot(
  {
    children,
    name,
    size = "medium",
    defaultValue,
    value,
    disabled,
    onValueChange,
    style,
    className,
    ...props
  },
  ref,
) {
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
          "inline-flex h-[var(--switch-height)] items-center gap-[var(--switch-gap)] rounded-[var(--switch-radius)] border border-border bg-muted p-[var(--switch-padding)] text-muted-foreground",
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
});

export interface SwitchControlProps
  extends Omit<React.LabelHTMLAttributes<HTMLLabelElement>, "children" | "onChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  label?: string;
  name?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  size?: SwitchSize;
  value: string;
}

const SwitchControl = React.forwardRef<HTMLLabelElement, SwitchControlProps>(function SwitchControl(
  {
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
    ...props
  },
  ref,
) {
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
        defaultChecked={isDefaultChecked}
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
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
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
});

SwitchRoot.displayName = "Switch";
SwitchControl.displayName = "Switch.Control";

export const Switch = Object.assign(SwitchRoot, {
  Control: SwitchControl,
});
