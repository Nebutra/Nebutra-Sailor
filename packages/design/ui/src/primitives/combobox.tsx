"use client";

import { cva } from "class-variance-authority";
import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { cn } from "../utils/cn";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./command";
import { Label } from "./label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

// =============================================================================
// Types
// =============================================================================

export type ComboboxSize = "sm" | "default" | "lg";

export interface ComboboxOption {
  /** Machine value — used for selection matching */
  value: string;
  /** Human-readable label displayed in trigger and list */
  label: string;
  /** Disable this specific option */
  disabled?: boolean;
  /** Assign to a group heading key */
  group?: string;
}

export interface ComboboxProps {
  /** Flat list of options — the component handles grouping internally via option.group */
  options?: ComboboxOption[];
  /** Currently selected value (controlled) */
  value?: string;
  /** Callback when selection changes */
  onChange?: (value: string) => void;
  /** Initial value for uncontrolled usage */
  defaultValue?: string;
  /** Disable the entire combobox */
  disabled?: boolean;
  /** Show error styling (red border) */
  error?: boolean;
  /** Size variant matching Geist scale */
  size?: ComboboxSize;
  /** Custom width — applied to both trigger and popover (e.g. "w-64" or "w-[240px]") */
  width?: string;
  /** Accessible label shown above the trigger */
  label?: string;
  /** Whether the label is visually hidden (still accessible) */
  hideLabel?: boolean;
  /** Text shown in trigger when nothing is selected */
  placeholder?: string;
  /** Text shown when no options match the search */
  emptyMessage?: string;
  /** Placeholder inside the search input */
  searchPlaceholder?: string;
  /** Composition mode — children provide their own CommandInput/List/etc. */
  children?: React.ReactNode;
  /** Additional CSS classes for the outer container */
  className?: string;
}

export interface ComboboxOptionProps {
  value: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export type ComboboxInputProps = React.ComponentPropsWithoutRef<typeof CommandInput>;

export type ComboboxEmptyProps = React.ComponentPropsWithoutRef<typeof CommandEmpty>;

export type ComboboxGroupProps = React.ComponentPropsWithoutRef<typeof CommandGroup>;

// =============================================================================
// CVA Variants
// =============================================================================

export const comboboxTriggerVariants = cva(
  [
    "flex w-full items-center justify-between gap-2 whitespace-nowrap",
    "rounded-[var(--radius-md)] border border-input bg-background px-3",
    "text-sm ring-offset-background",
    "transition-colors duration-150 ease-out",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "[&>span]:line-clamp-1 [&>span]:text-left",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "h-8 text-xs",
        default: "h-10",
        lg: "h-12 text-base",
      },
      error: {
        true: "border-destructive focus-visible:ring-destructive",
        false: "",
      },
    },
    defaultVariants: {
      size: "default",
      error: false,
    },
  },
);

// =============================================================================
// Context
// =============================================================================

interface ComboboxContextValue {
  selectedValue: string;
  onSelect: (value: string) => void;
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useComboboxContext(): ComboboxContextValue {
  const ctx = React.useContext(ComboboxContext);
  if (!ctx) {
    throw new Error("Combobox sub-components must be used within <Combobox>");
  }
  return ctx;
}

// =============================================================================
// ComboboxOption (sub-component)
// =============================================================================

const ComboboxOptionItem = React.forwardRef<
  React.ElementRef<typeof CommandItem>,
  ComboboxOptionProps
>(({ value, label, disabled, className, children }, ref) => {
  const { selectedValue, onSelect } = useComboboxContext();
  const isSelected = selectedValue === value;

  // Build keywords for cmdk search: prefer explicit label, fall back to string children
  const keywords = React.useMemo(() => {
    if (label) return [label];
    if (typeof children === "string") return [children];
    return undefined;
  }, [label, children]);

  return (
    <CommandItem
      ref={ref}
      value={value}
      {...(keywords ? { keywords } : {})}
      disabled={disabled ?? false}
      onSelect={onSelect}
      className={cn("gap-2", className)}
    >
      <Check
        aria-hidden="true"
        className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
      />
      {children ?? label ?? value}
    </CommandItem>
  );
});
ComboboxOptionItem.displayName = "Combobox.Option";

// =============================================================================
// ComboboxInput (sub-component)
// =============================================================================

const ComboboxInput = React.forwardRef<React.ElementRef<typeof CommandInput>, ComboboxInputProps>(
  (props, ref) => <CommandInput ref={ref} {...props} />,
);
ComboboxInput.displayName = "Combobox.Input";

// =============================================================================
// ComboboxEmpty (sub-component)
// =============================================================================

const ComboboxEmpty = React.forwardRef<React.ElementRef<typeof CommandEmpty>, ComboboxEmptyProps>(
  (props, ref) => <CommandEmpty ref={ref} {...props} />,
);
ComboboxEmpty.displayName = "Combobox.Empty";

// =============================================================================
// ComboboxGroup (sub-component)
// =============================================================================

const ComboboxGroupSub = React.forwardRef<
  React.ElementRef<typeof CommandGroup>,
  ComboboxGroupProps
>((props, ref) => <CommandGroup ref={ref} {...props} />);
ComboboxGroupSub.displayName = "Combobox.Group";

// =============================================================================
// ComboboxSeparator (sub-component)
// =============================================================================

const ComboboxSeparator = CommandSeparator;

// =============================================================================
// ComboboxRoot
// =============================================================================

function ComboboxRoot({
  options,
  value: controlledValue,
  onChange,
  defaultValue = "",
  disabled = false,
  error = false,
  size = "default",
  width,
  label,
  hideLabel = false,
  placeholder = "Select...",
  emptyMessage = "No results found.",
  searchPlaceholder = "Search...",
  children,
  className,
}: ComboboxProps) {
  // Controlled / uncontrolled value management
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const selectedValue = controlledValue !== undefined ? controlledValue : internalValue;

  // Ref to avoid stale closure in handleSelect toggle logic
  const selectedValueRef = React.useRef(selectedValue);
  selectedValueRef.current = selectedValue;

  const [open, setOpen] = React.useState(false);

  const handleSelect = React.useCallback(
    (incoming: string) => {
      const current = selectedValueRef.current;
      const next = incoming === current ? "" : incoming;
      if (controlledValue === undefined) setInternalValue(next);
      onChange?.(next);
      setOpen(false);
    },
    [controlledValue, onChange],
  );

  // Find label for currently selected value when using options prop
  const selectedLabel = React.useMemo(() => {
    if (!options) return selectedValue;
    return options.find((o) => o.value === selectedValue)?.label ?? selectedValue;
  }, [options, selectedValue]);

  const labelId = React.useId();
  const triggerId = React.useId();
  const listboxId = React.useId();

  const contextValue = React.useMemo(
    () => ({ selectedValue, onSelect: handleSelect }),
    [selectedValue, handleSelect],
  );

  // Group options by their `group` key
  const groupedOptions = React.useMemo(() => {
    if (!options) return null;
    const grouped = new Map<string | undefined, ComboboxOption[]>();
    for (const opt of options) {
      const key = opt.group;
      const group = grouped.get(key);
      if (group) {
        group.push(opt);
      } else {
        grouped.set(key, [opt]);
      }
    }
    return grouped;
  }, [options]);

  const renderContent = () => {
    if (groupedOptions) {
      return (
        <>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {Array.from(groupedOptions.entries()).map(([group, opts]) => (
              <CommandGroup key={group ?? "__ungrouped__"} heading={group}>
                {opts.map((opt) => (
                  <ComboboxOptionItem
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled ?? false}
                  >
                    {opt.label}
                  </ComboboxOptionItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </>
      );
    }
    return children;
  };

  return (
    <ComboboxContext.Provider value={contextValue}>
      <div className={cn("flex flex-col gap-1.5", width, className)}>
        {label && (
          <Label id={labelId} htmlFor={triggerId} className={cn(hideLabel && "sr-only")}>
            {label}
          </Label>
        )}
        <Popover
          open={open}
          onOpenChange={(isOpen) => {
            if (!disabled) setOpen(isOpen);
          }}
        >
          <PopoverTrigger asChild>
            <button
              id={triggerId}
              type="button"
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-labelledby={label ? labelId : undefined}
              aria-label={!label ? placeholder : undefined}
              disabled={disabled}
              className={cn(comboboxTriggerVariants({ size, error }))}
            >
              <span className={cn(!selectedValue && "text-muted-foreground")}>
                {selectedValue ? selectedLabel : placeholder}
              </span>
              <ChevronsUpDown aria-hidden="true" className="h-4 w-4 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
            <Command id={listboxId}>{renderContent()}</Command>
          </PopoverContent>
        </Popover>
      </div>
    </ComboboxContext.Provider>
  );
}
ComboboxRoot.displayName = "Combobox";

// =============================================================================
// Compound Export
// =============================================================================

/**
 * Combobox — Geist-style searchable select with compound API.
 *
 * @example Simple mode (options prop — fully self-contained)
 * ```tsx
 * <Combobox
 *   label="Framework"
 *   options={[
 *     { value: "next", label: "Next.js" },
 *     { value: "remix", label: "Remix" },
 *   ]}
 *   value={value}
 *   onChange={setValue}
 *   placeholder="Select framework..."
 * />
 * ```
 *
 * @example Composition mode (manual children)
 * ```tsx
 * <Combobox value={value} onChange={setValue} placeholder="Search...">
 *   <Combobox.Input placeholder="Search frameworks..." />
 *   <CommandList>
 *     <Combobox.Empty>Nothing here.</Combobox.Empty>
 *     <Combobox.Group heading="Frontend">
 *       <Combobox.Option value="next">Next.js</Combobox.Option>
 *       <Combobox.Option value="remix">Remix</Combobox.Option>
 *     </Combobox.Group>
 *   </CommandList>
 * </Combobox>
 * ```
 */
const Combobox = Object.assign(ComboboxRoot, {
  Input: ComboboxInput,
  Option: ComboboxOptionItem,
  Empty: ComboboxEmpty,
  Group: ComboboxGroupSub,
  Separator: ComboboxSeparator,
});

export {
  Combobox,
  ComboboxEmpty,
  ComboboxGroupSub,
  ComboboxInput,
  ComboboxOptionItem,
  ComboboxRoot,
  ComboboxSeparator,
};
