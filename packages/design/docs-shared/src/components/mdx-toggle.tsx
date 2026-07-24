"use client";

import { cn } from "@nebutra/ui/utils";
import {
  type ButtonHTMLAttributes,
  Children,
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

type ToggleVariant = "default" | "outline";
type ToggleSize = "default" | "sm" | "lg";

type ToggleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  variant?: ToggleVariant;
  size?: ToggleSize;
};

type ToggleGroupType = "single" | "multiple";
type ToggleGroupValue = string | string[] | undefined;

type ToggleGroupContextValue = {
  type: ToggleGroupType;
  value: string[];
  toggleValue: (value: string) => void;
  variant: ToggleVariant;
  size: ToggleSize;
};

type ToggleGroupProps = {
  children: ReactNode;
  type: ToggleGroupType;
  value?: ToggleGroupValue;
  defaultValue?: ToggleGroupValue;
  onValueChange?: (value: string | string[]) => void;
  variant?: ToggleVariant;
  size?: ToggleSize;
  className?: string;
};

type ToggleGroupItemProps = Omit<ToggleProps, "pressed" | "defaultPressed"> & {
  value: string;
};

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

function getToggleClassName(variant: ToggleVariant, size: ToggleSize) {
  return cn(
    "inline-flex items-center justify-center rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    variant === "outline"
      ? "border-border bg-background hover:bg-accent hover:text-accent-foreground"
      : "border-transparent bg-muted hover:bg-muted/80",
    size === "sm" ? "h-8 px-2.5" : size === "lg" ? "h-11 px-4" : "h-9 px-3",
  );
}

export function Toggle({
  className,
  pressed,
  defaultPressed = false,
  onPressedChange,
  variant = "default",
  size = "default",
  onClick,
  type = "button",
  ...props
}: ToggleProps) {
  const [internalPressed, setInternalPressed] = useState(defaultPressed);
  const isControlled = pressed !== undefined;
  const isPressed = isControlled ? pressed : internalPressed;

  return (
    <button
      type={type}
      aria-pressed={isPressed}
      data-state={isPressed ? "on" : "off"}
      className={cn(
        getToggleClassName(variant, size),
        isPressed && "bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
      onClick={(event) => {
        const nextPressed = !isPressed;
        if (!isControlled) setInternalPressed(nextPressed);
        onPressedChange?.(nextPressed);
        onClick?.(event);
      }}
      {...props}
    />
  );
}

export function ToggleGroup({
  children,
  type,
  value,
  defaultValue,
  onValueChange,
  variant = "default",
  size = "default",
  className,
}: ToggleGroupProps) {
  const normalizedDefault = useMemo(() => {
    if (Array.isArray(defaultValue)) return defaultValue;
    if (typeof defaultValue === "string") return [defaultValue];
    return [];
  }, [defaultValue]);

  const [internalValue, setInternalValue] = useState<string[]>(normalizedDefault);
  const isControlled = value !== undefined;
  const currentValue = useMemo(() => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") return [value];
    return internalValue;
  }, [internalValue, value]);

  const context = useMemo<ToggleGroupContextValue>(
    () => ({
      type,
      value: currentValue,
      toggleValue(nextValue) {
        const next =
          type === "single"
            ? currentValue[0] === nextValue
              ? []
              : [nextValue]
            : currentValue.includes(nextValue)
              ? currentValue.filter((item) => item !== nextValue)
              : [...currentValue, nextValue];

        if (!isControlled) setInternalValue(next);
        onValueChange?.(type === "single" ? (next[0] ?? "") : next);
      },
      variant,
      size,
    }),
    [currentValue, isControlled, onValueChange, size, type, variant],
  );

  return (
    <ToggleGroupContext.Provider value={context}>
      <div className={cn("inline-flex items-center gap-1", className)}>
        {Children.map(children, (child) => {
          if (!isValidElement(child)) return child;
          return cloneElement(child as ReactElement<ToggleGroupItemProps>);
        })}
      </div>
    </ToggleGroupContext.Provider>
  );
}

export function ToggleGroupItem({
  value,
  className,
  variant,
  size,
  onClick,
  ...props
}: ToggleGroupItemProps) {
  const context = useContext(ToggleGroupContext);

  if (!context) {
    throw new Error("ToggleGroupItem must be used within ToggleGroup.");
  }

  const isPressed = context.value.includes(value);

  return (
    <Toggle
      pressed={isPressed}
      variant={variant ?? context.variant}
      size={size ?? context.size}
      className={className}
      onClick={(event) => {
        context.toggleValue(value);
        onClick?.(event);
      }}
      {...props}
    />
  );
}
