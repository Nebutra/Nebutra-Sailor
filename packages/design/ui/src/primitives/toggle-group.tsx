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
    <div
      ref={ref}
      role={type === "single" ? "radiogroup" : "group"}
      data-toggle-group-root=""
      className={cn(toggleGroupVariants({ variant }), className)}
      {...props}
    >
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
      // Re-clicking the selected item is a no-op, not a deselect. This group
      // renders role="radiogroup" / role="radio" / aria-checked, and a radio
      // that clears itself contradicts the contract it announces — a screen
      // reader is told one of these is always chosen. It also drove four real
      // call sites into an invalid state, including the site-wide theme
      // switcher, because each one casts the value straight into a typed
      // setter: `setTheme(v as Theme)` with v === "" is not a theme.
      //
      // One call site had already discovered this and guarded with `if (v)`.
      // A hazard every consumer has to remember is a defect in the primitive.
      if (isSelected) return;
      context.onValueChange(value);
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

  // ─── Roving tabindex + arrow-key navigation (WAI-ARIA radiogroup pattern) ───
  // Only applies to type="single" — a radiogroup is a single tab stop with
  // arrow keys moving *and selecting* the focused item. A "multiple" group is
  // a row of independent toggle buttons (checkbox semantics), each its own
  // tab stop, so it opts out entirely.
  function handleItemKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    props.onKeyDown?.(event);
    if (context.type !== "single" || event.defaultPrevented) return;

    const container = event.currentTarget.closest<HTMLElement>("[data-toggle-group-root]");
    if (!container) return;
    const items = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-toggle-item]:not(:disabled)"),
    );
    const currentIndex = items.indexOf(event.currentTarget);
    if (currentIndex === -1 || items.length === 0) return;

    const focusAndSelect = (targetIndex: number) => {
      const wrapped = ((targetIndex % items.length) + items.length) % items.length;
      const target = items[wrapped];
      if (!target) return;
      target.focus();
      const targetValue = target.dataset.toggleValue;
      if (targetValue !== undefined) context.onValueChange(targetValue);
    };

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusAndSelect(currentIndex + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusAndSelect(currentIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        event.preventDefault();
        focusAndSelect(items.length - 1);
        break;
      default:
        break;
    }
  }

  // Roving tab stop: only the selected item is tabbable once a selection
  // exists. Before any selection is made, every item stays tabbable so the
  // group is never unreachable by keyboard.
  const rovingTabIndex =
    context.type === "single" ? (isSelected || context.value === "" ? 0 : -1) : undefined;

  // `role` below is a runtime ternary ("radio" for type="single", the native
  // "button" role for "multiple"), which the static checker can't resolve —
  // aria-checked is only ever emitted alongside role="radio".
  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: see comment above.
    <button
      ref={ref}
      type="button"
      disabled={isDisabled}
      data-state={isSelected ? "on" : "off"}
      data-toggle-item=""
      data-toggle-value={value}
      role={context.type === "single" ? "radio" : undefined}
      aria-checked={context.type === "single" ? isSelected : undefined}
      aria-pressed={context.type === "multiple" ? isSelected : undefined}
      tabIndex={rovingTabIndex}
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
      onKeyDown={handleItemKeyDown}
    >
      {children}
    </button>
  );
};
ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem };
