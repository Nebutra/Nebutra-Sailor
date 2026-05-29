"use client";

import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";
import { toggleGroupItemVariants, toggleGroupVariants } from "./toggle-group-variants";

type ToggleGroupType = "single" | "multiple";
type ToggleGroupValue = string | string[];
type ToggleGroupItemVariant = VariantProps<typeof toggleGroupItemVariants>["variant"];
type ToggleGroupItemSize = VariantProps<typeof toggleGroupItemVariants>["size"];

const ToggleGroupTypeContext = React.createContext<ToggleGroupType | null>(null);
const ToggleGroupValueContext = React.createContext<ToggleGroupValue | null>(null);
const ToggleGroupChangeContext = React.createContext<((value: ToggleGroupValue) => void) | null>(
  null,
);
const ToggleGroupDisabledContext = React.createContext<boolean | undefined>(undefined);
const ToggleGroupVariantContext = React.createContext<ToggleGroupItemVariant>(undefined);
const ToggleGroupSizeContext = React.createContext<ToggleGroupItemSize>(undefined);

function useToggleGroup() {
  const type = React.use(ToggleGroupTypeContext);
  const value = React.use(ToggleGroupValueContext);
  const onValueChange = React.use(ToggleGroupChangeContext);
  const disabled = React.use(ToggleGroupDisabledContext);
  const variant = React.use(ToggleGroupVariantContext);
  const size = React.use(ToggleGroupSizeContext);

  if (type === null || value === null || onValueChange === null) {
    throw new Error("ToggleGroup internal components must be used within a ToggleGroup");
  }

  return { disabled, onValueChange, size, type, value, variant };
}

export interface ToggleGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toggleGroupVariants>,
    VariantProps<typeof toggleGroupItemVariants> {
  type?: ToggleGroupType;
  value?: ToggleGroupValue;
  defaultValue?: ToggleGroupValue;
  onValueChange?: (value: ToggleGroupValue) => void;
  disabled?: boolean;
}

const ToggleGroup = ({
  className,
  variant,
  size,
  type = "single",
  value: controlledValue,
  defaultValue,
  onValueChange,
  disabled,
  children,
  ref,
  ...props
}: ToggleGroupProps & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<ToggleGroupValue>(
    defaultValue !== undefined ? defaultValue : type === "single" ? "" : [],
  );

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  function changeToggleGroupValue(newValue: ToggleGroupValue) {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
  }

  return (
    <div ref={ref} className={cn(toggleGroupVariants({ variant }), className)} {...props}>
      <ToggleGroupTypeContext.Provider value={type}>
        <ToggleGroupValueContext.Provider value={value}>
          <ToggleGroupChangeContext.Provider value={changeToggleGroupValue}>
            <ToggleGroupDisabledContext.Provider value={disabled}>
              <ToggleGroupVariantContext.Provider value={variant}>
                <ToggleGroupSizeContext.Provider value={size}>
                  {children}
                </ToggleGroupSizeContext.Provider>
              </ToggleGroupVariantContext.Provider>
            </ToggleGroupDisabledContext.Provider>
          </ToggleGroupChangeContext.Provider>
        </ToggleGroupValueContext.Provider>
      </ToggleGroupTypeContext.Provider>
    </div>
  );
};
ToggleGroup.displayName = "ToggleGroup";

export interface ToggleGroupItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "type">,
    VariantProps<typeof toggleGroupItemVariants> {
  value: string;
}

const ToggleGroupItem = ({
  className,
  variant,
  size,
  value,
  children,
  ref,
  ...props
}: ToggleGroupItemProps & { ref?: React.Ref<HTMLButtonElement> | undefined }) => {
  const context = useToggleGroup();
  const isDisabled = context.disabled || props.disabled;
  const isSelected =
    context.type === "single"
      ? context.value === value
      : Array.isArray(context.value) && context.value.includes(value);

  function toggleItemSelection(event: React.MouseEvent<HTMLButtonElement>) {
    if (isDisabled) return;

    if (context.type === "single") {
      context.onValueChange(isSelected ? "" : value);
    } else {
      const currentArray = Array.isArray(context.value) ? context.value : [];
      context.onValueChange(
        isSelected
          ? currentArray.filter((currentValue) => currentValue !== value)
          : [...currentArray, value],
      );
    }

    props.onClick?.(event);
  }

  return (
    <button
      ref={ref}
      type="button"
      disabled={isDisabled}
      data-state={isSelected ? "on" : "off"}
      aria-pressed={isSelected}
      className={cn(
        toggleGroupItemVariants({
          variant: variant ?? context.variant,
          size: size ?? context.size,
        }),
        className,
        "focus-visible:z-10",
      )}
      onClick={toggleItemSelection}
      {...props}
    >
      {children}
    </button>
  );
};
ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem };
