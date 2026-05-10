"use client";
import { cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================
type ChoiceboxType = "radio" | "checkbox";
type ChoiceboxDirection = "row" | "column";
/**
 * Props for ChoiceboxGroup — the container component
 */
export interface ChoiceboxGroupProps {
  /** Selection mode */
  type: ChoiceboxType;
  /** Layout direction */
  direction?: ChoiceboxDirection;
  /** Accessible label for the group */
  label: string;
  /** Visually display the label (always present as aria-label) */
  showLabel?: boolean;
  /** Current value — string for radio, string[] for checkbox */
  value?: string | string[];
  /** Default value for uncontrolled usage */
  defaultValue?: string | string[];
  /** Callback when value changes */
  onChange?: (value: string | string[]) => void;
  /** Disable all items */
  disabled?: boolean;
  /** Additional CSS classes for the group container */
  className?: string;
  /** ChoiceboxGroup.Item elements */
  children: React.ReactNode;
}
/**
 * Props for ChoiceboxGroup.Item — an individual selectable card
 */
export interface ChoiceboxItemProps {
  /** Display title */
  title: string;
  /** Secondary description text */
  description?: string;
  /** Unique value identifier */
  value: string;
  /** Disable this specific item */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Custom content rendered below title/description when selected */
  children?: React.ReactNode;
}
// =============================================================================
// Context
// =============================================================================
interface ChoiceboxContextType {
  type: ChoiceboxType;
  value: string | string[];
  onItemSelect: (itemValue: string) => void;
  disabled: boolean;
  /** Ref registration for roving tabindex (radio mode) */
  registerItem: (value: string, el: HTMLDivElement | null) => void;
  /** Navigate to adjacent item (radio mode) */
  navigateItem: (currentValue: string, direction: 1 | -1) => void;
  /** First item value in insertion order (roving tabindex fallback) */
  getFirstItemValue: () => string | undefined;
}
const ChoiceboxContext = React.createContext<ChoiceboxContextType | null>(null);
function useChoiceboxContext(): ChoiceboxContextType {
  const context = React.useContext(ChoiceboxContext);
  if (!context) {
    throw new Error("ChoiceboxGroup.Item must be used within a ChoiceboxGroup");
  }
  return context;
}
// =============================================================================
// CVA Variants
// =============================================================================
export const choiceboxItemVariants = cva(
  [
    "relative flex flex-1 flex-col gap-1 rounded-[var(--radius-lg)] border p-4",
    "cursor-pointer select-none",
    "transition-colors duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  ].join(" "),
  {
    variants: {
      selected: {
        true: "border-primary bg-primary/5 dark:bg-primary/10",
        false: "border-border bg-card hover:border-primary/50 hover:bg-accent/50",
      },
      isDisabled: {
        true: "opacity-50 cursor-not-allowed",
        false: "",
      },
    },
    compoundVariants: [
      {
        selected: true,
        isDisabled: true,
        className: "border-primary/30 bg-primary/5",
      },
    ],
    defaultVariants: {
      selected: false,
      isDisabled: false,
    },
  },
);
// =============================================================================
// ChoiceboxItem
// =============================================================================
function ChoiceboxItem({
  title,
  description,
  value,
  disabled: itemDisabled = false,
  className,
  children,
}: ChoiceboxItemProps) {
  const {
    type,
    value: groupValue,
    onItemSelect,
    disabled: groupDisabled,
    registerItem,
    navigateItem,
    getFirstItemValue,
  } = useChoiceboxContext();
  const ref = React.useRef<HTMLDivElement>(null);
  const isDisabled = groupDisabled || itemDisabled;
  const isSelected =
    type === "radio"
      ? groupValue === value
      : Array.isArray(groupValue) && groupValue.includes(value);
  // Register element ref for roving tabindex
  React.useEffect(() => {
    const registeredValue = value;
    registerItem(registeredValue, ref.current);
    return () => registerItem(registeredValue, null);
  }, [value, registerItem]);
  // Radio roving tabindex: only selected (or first enabled) item is tabbable
  const isRadio = type === "radio";
  const hasRadioSelection = isRadio && groupValue !== "" && groupValue !== undefined;
  const isFirstItem = !hasRadioSelection && value === getFirstItemValue();
  const tabIndex = isDisabled ? -1 : isRadio ? (isSelected || isFirstItem ? 0 : -1) : 0;
  const handleClick = () => {
    if (!isDisabled) onItemSelect(value);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDisabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onItemSelect(value);
      return;
    }
    // Arrow key navigation for radio mode
    if (isRadio) {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        navigateItem(value, 1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        navigateItem(value, -1);
      }
    }
  };
  const wrapperClassName = cn(
    choiceboxItemVariants({ selected: isSelected, isDisabled }),
    className,
  );
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium leading-tight text-foreground">{title}</span>
          {description && (
            <span className="text-xs leading-normal text-muted-foreground">{description}</span>
          )}
        </div>
        {/* Visual selection indicator */}
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border-2 transition-colors",
            isRadio ? "rounded-full" : "rounded-[var(--radius-sm)]",
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30",
          )}
        >
          {isSelected &&
            (isRadio ? (
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            ) : (
              <svg
                aria-hidden="true"
                className="h-2.5 w-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ))}
        </span>
      </div>
      {/* Custom content — visible when selected */}
      {children && isSelected && (
        <div className="mt-2 border-t border-border/50 pt-2">{children}</div>
      )}
    </>
  );
  // Conditional rendering — static ARIA attribute values for Edge Tools analysis
  if (isRadio) {
    if (isSelected) {
      return isDisabled ? (
        // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
        <div
          ref={ref}
          role="radio"
          aria-checked="true"
          aria-disabled="true"
          tabIndex={tabIndex}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={wrapperClassName}
        >
          {content}
        </div>
      ) : (
        // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
        <div
          ref={ref}
          role="radio"
          aria-checked="true"
          tabIndex={tabIndex}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={wrapperClassName}
        >
          {content}
        </div>
      );
    }
    return isDisabled ? (
      // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
      <div
        ref={ref}
        role="radio"
        aria-checked="false"
        aria-disabled="true"
        tabIndex={tabIndex}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={wrapperClassName}
      >
        {content}
      </div>
    ) : (
      // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
      <div
        ref={ref}
        role="radio"
        aria-checked="false"
        tabIndex={tabIndex}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={wrapperClassName}
      >
        {content}
      </div>
    );
  }
  if (isSelected) {
    return isDisabled ? (
      // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
      <div
        ref={ref}
        role="checkbox"
        aria-checked="true"
        aria-disabled="true"
        tabIndex={tabIndex}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={wrapperClassName}
      >
        {content}
      </div>
    ) : (
      // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
      <div
        ref={ref}
        role="checkbox"
        aria-checked="true"
        tabIndex={tabIndex}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={wrapperClassName}
      >
        {content}
      </div>
    );
  }
  return isDisabled ? (
    // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
    <div
      ref={ref}
      role="checkbox"
      aria-checked="false"
      aria-disabled="true"
      tabIndex={tabIndex}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={wrapperClassName}
    >
      {content}
    </div>
  ) : (
    // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
    <div
      ref={ref}
      role="checkbox"
      aria-checked="false"
      tabIndex={tabIndex}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={wrapperClassName}
    >
      {content}
    </div>
  );
}
ChoiceboxItem.displayName = "ChoiceboxGroup.Item";
// =============================================================================
// ChoiceboxGroup
// =============================================================================
function ChoiceboxGroupRoot({
  type,
  direction = "row",
  label,
  showLabel = false,
  value: controlledValue,
  defaultValue,
  onChange,
  disabled = false,
  className,
  children,
}: ChoiceboxGroupProps) {
  // Uncontrolled fallback
  const [internalValue, setInternalValue] = React.useState<string | string[]>(() => {
    if (controlledValue !== undefined) return controlledValue;
    if (defaultValue !== undefined) return defaultValue;
    return type === "checkbox" ? [] : "";
  });
  const currentValue = controlledValue !== undefined ? controlledValue : internalValue;
  // Item ref registry for roving tabindex
  const itemRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const itemOrder = React.useRef<string[]>([]);
  const registerItem = React.useCallback((itemValue: string, el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(itemValue, el);
      // Maintain insertion order
      if (!itemOrder.current.includes(itemValue)) {
        itemOrder.current.push(itemValue);
      }
    } else {
      itemRefs.current.delete(itemValue);
      itemOrder.current = itemOrder.current.filter((v) => v !== itemValue);
    }
  }, []);
  const onItemSelect = React.useCallback(
    (itemValue: string) => {
      if (type === "radio") {
        if (controlledValue === undefined) setInternalValue(itemValue);
        onChange?.(itemValue);
      } else {
        const arr = Array.isArray(currentValue) ? currentValue : [];
        const newValue = arr.includes(itemValue)
          ? arr.filter((v) => v !== itemValue)
          : [...arr, itemValue];
        if (controlledValue === undefined) setInternalValue(newValue);
        onChange?.(newValue);
      }
    },
    [type, currentValue, controlledValue, onChange],
  );
  const navigateItem = React.useCallback(
    (fromValue: string, dir: 1 | -1) => {
      const order = itemOrder.current;
      let idx = order.indexOf(fromValue);
      if (idx === -1) return;
      // Skip disabled items (check aria-disabled on the element)
      let attempts = 0;
      do {
        idx = (idx + dir + order.length) % order.length;
        attempts++;
      } while (
        itemRefs.current.get(order[idx] ?? "")?.getAttribute("aria-disabled") === "true" &&
        attempts < order.length
      );
      const nextValue = order[idx];
      if (nextValue === undefined) return;
      const nextEl = itemRefs.current.get(nextValue);
      if (nextEl && nextEl.getAttribute("aria-disabled") !== "true") {
        nextEl.focus();
        onItemSelect(nextValue);
      }
    },
    [onItemSelect],
  );
  const getFirstItemValue = React.useCallback(() => itemOrder.current[0], []);
  // Dev warning for type/value mismatch
  if (process.env.NODE_ENV !== "production") {
    if (type === "checkbox" && typeof controlledValue === "string") {
    }
    if (type === "radio" && Array.isArray(controlledValue)) {
    }
  }
  const contextValue = React.useMemo(
    () => ({
      type,
      value: currentValue,
      onItemSelect,
      disabled,
      registerItem,
      navigateItem,
      getFirstItemValue,
    }),
    [type, currentValue, onItemSelect, disabled, registerItem, navigateItem, getFirstItemValue],
  );
  const labelId = React.useId();
  const containerClass = cn(
    "flex",
    direction === "row" ? "flex-row" : "flex-col",
    "gap-3",
    className,
  );
  const ariaLabelledBy = showLabel ? labelId : undefined;
  const ariaLabel = !showLabel ? label : undefined;
  return (
    <ChoiceboxContext.Provider value={contextValue}>
      {showLabel && (
        <span id={labelId} className="mb-1 text-sm font-medium text-foreground">
          {label}
        </span>
      )}
      {type === "radio" ? (
        <div
          role="radiogroup"
          aria-labelledby={ariaLabelledBy}
          aria-label={ariaLabel}
          className={containerClass}
        >
          {children}
        </div>
      ) : (
        // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
        <div
          role="group"
          aria-labelledby={ariaLabelledBy}
          aria-label={ariaLabel}
          className={containerClass}
        >
          {children}
        </div>
      )}
    </ChoiceboxContext.Provider>
  );
}
ChoiceboxGroupRoot.displayName = "ChoiceboxGroup";
// =============================================================================
// Compound Export
// =============================================================================
/**
 * ChoiceboxGroup — Geist-style card selection control
 *
 * A larger form of Radio or Checkbox where the user has a larger
 * tap target and more details per option.
 *
 * @example Single-select (radio)
 * ```tsx
 * <ChoiceboxGroup type="radio" direction="row" label="Plan" value={val} onChange={setVal}>
 *   <ChoiceboxGroup.Item title="Pro Trial" description="Free for two weeks" value="trial" />
 *   <ChoiceboxGroup.Item title="Pro" description="Get started now" value="pro" />
 * </ChoiceboxGroup>
 * ```
 *
 * @example Multi-select (checkbox)
 * ```tsx
 * <ChoiceboxGroup type="checkbox" direction="row" label="Features" value={vals} onChange={setVals}>
 *   <ChoiceboxGroup.Item title="Analytics" description="Track usage" value="analytics" />
 *   <ChoiceboxGroup.Item title="API" description="REST + GraphQL" value="api" />
 * </ChoiceboxGroup>
 * ```
 */
const ChoiceboxGroup = Object.assign(ChoiceboxGroupRoot, {
  Item: ChoiceboxItem,
});

export { ChoiceboxGroup };
