"use client";

import { Check, ChevronUpDown as ChevronsUpDown } from "@nebutra/icons";
import { cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  type CommandListProps,
  CommandSeparator,
} from "./command";
import { Label } from "./label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

// =============================================================================
// Types
// =============================================================================

export type ComboboxSize = "small" | "medium" | "large";
type LegacyComboboxSize = "sm" | "default" | "lg";
type ComboboxValue = string | null;
type ComboboxWidth = number | string;
type ComboboxStyle = React.CSSProperties & {
  "--combobox-width"?: string;
  "--combobox-trigger-height"?: string;
  "--combobox-trigger-padding-x"?: string;
  "--combobox-font-size"?: string;
};

const comboboxSizeMap = {
  sm: "small",
  default: "medium",
  lg: "large",
  small: "small",
  medium: "medium",
  large: "large",
} as const satisfies Record<ComboboxSize | LegacyComboboxSize, ComboboxSize>;

const comboboxSizeTokens = {
  small: {
    "--combobox-trigger-height": "2rem",
    "--combobox-trigger-padding-x": "0.625rem",
    "--combobox-font-size": "0.75rem",
  },
  medium: {
    "--combobox-trigger-height": "2.5rem",
    "--combobox-trigger-padding-x": "0.75rem",
    "--combobox-font-size": "0.875rem",
  },
  large: {
    "--combobox-trigger-height": "3rem",
    "--combobox-trigger-padding-x": "0.875rem",
    "--combobox-font-size": "1rem",
  },
} as const satisfies Record<ComboboxSize, ComboboxStyle>;

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

interface ComboboxBaseProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Flat list of options — the component handles grouping internally via option.group */
  options?: ComboboxOption[];
  /** Disable the entire combobox */
  disabled?: boolean;
  /** Show error styling. Prefer `errored`; `error` is kept for existing consumers. */
  errored?: boolean;
  /** @deprecated Use `errored`. */
  error?: boolean;
  /** Size variant matching Nebutra form controls. Legacy `sm`/`default`/`lg` values still map through. */
  size?: ComboboxSize | LegacyComboboxSize;
  /** Custom root width. Numbers are treated as pixels; strings can be CSS lengths. */
  width?: ComboboxWidth;
  /** Custom list max width. Numbers are treated as pixels; strings can be CSS lengths. */
  listMaxWidth?: ComboboxWidth;
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
  /** Loading state for async option providers. */
  loading?: boolean;
  /** Text shown while async options are loading. */
  loadingMessage?: string;
  /** Accessible name when no visible label is rendered. */
  "aria-label"?: string;
}

interface ControlledComboboxProps extends ComboboxBaseProps {
  value: ComboboxValue;
  onChange: (value: ComboboxValue) => void;
  defaultValue?: never;
}

interface UncontrolledComboboxProps extends ComboboxBaseProps {
  value?: never;
  onChange?: (value: ComboboxValue) => void;
  defaultValue?: ComboboxValue;
}

export type ComboboxProps = ControlledComboboxProps | UncontrolledComboboxProps;

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

export interface ComboboxListProps extends CommandListProps {
  emptyMessage?: React.ReactNode;
  // explicit `| undefined` to accept passthrough under `exactOptionalPropertyTypes`
  maxWidth?: ComboboxWidth | undefined;
}

// =============================================================================
// CVA Variants
// =============================================================================

export const comboboxTriggerVariants = cva(
  [
    "flex w-full items-center justify-between gap-2 whitespace-nowrap",
    "h-[var(--combobox-trigger-height)] rounded-[var(--radius-md)] border border-input bg-background px-[var(--combobox-trigger-padding-x)]",
    "text-[length:var(--combobox-font-size)] ring-offset-background",
    "transition-colors duration-micro ease-out",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "[&>span]:line-clamp-1 [&>span]:text-left",
  ].join(" "),
  {
    variants: {
      size: {
        small: "",
        medium: "",
        large: "",
      },
      error: {
        true: "border-destructive focus-visible:ring-destructive",
        false: "",
      },
    },
    defaultVariants: {
      size: "medium",
      error: false,
    },
  },
);

// =============================================================================
// Context
// =============================================================================

interface ComboboxContextValue {
  selectedValue: ComboboxValue;
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

const ComboboxList = React.forwardRef<React.ElementRef<typeof CommandList>, ComboboxListProps>(
  ({ children, className, emptyMessage = "No results found.", maxWidth, style, ...props }, ref) => {
    const listStyle = {
      ...style,
      ...(maxWidth ? { maxWidth: toCssLength(maxWidth) } : undefined),
    } satisfies React.CSSProperties;

    return (
      <CommandList ref={ref} className={className} style={listStyle} {...props}>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        {children}
      </CommandList>
    );
  },
);
ComboboxList.displayName = "Combobox.List";

// =============================================================================
// ComboboxRoot
// =============================================================================

function toCssLength(value: ComboboxWidth): string {
  return typeof value === "number" ? `${value}px` : value;
}

function ComboboxRoot({
  options,
  value: controlledValue,
  onChange,
  defaultValue = null,
  disabled = false,
  errored,
  error = false,
  size = "medium",
  width,
  listMaxWidth,
  label,
  hideLabel = false,
  placeholder = "Select...",
  emptyMessage = "No results found.",
  searchPlaceholder = "Search...",
  loading = false,
  loadingMessage = "Loading options...",
  children,
  className,
  style,
  "aria-label": ariaLabel,
  ...props
}: ComboboxProps) {
  // Controlled / uncontrolled value management
  const [internalValue, setInternalValue] = React.useState<ComboboxValue>(defaultValue);
  const selectedValue = controlledValue !== undefined ? controlledValue : internalValue;
  const normalizedSize = comboboxSizeMap[size];
  const isErrored = errored ?? error;

  // Ref to avoid stale closure in handleSelect toggle logic
  const selectedValueRef = React.useRef(selectedValue);
  selectedValueRef.current = selectedValue;

  const [open, setOpen] = React.useState(false);

  const handleSelect = React.useCallback(
    (incoming: string) => {
      const current = selectedValueRef.current;
      const next = incoming === current ? null : incoming;
      if (controlledValue === undefined) setInternalValue(next);
      onChange?.(next);
      setOpen(false);
    },
    [controlledValue, onChange],
  );

  // Find label for currently selected value when using options prop
  const selectedLabel = React.useMemo(() => {
    if (!selectedValue) return "";
    if (!options) return selectedValue;
    return options.find((o) => o.value === selectedValue)?.label ?? selectedValue;
  }, [options, selectedValue]);

  const labelId = React.useId();
  const triggerId = React.useId();
  const listboxId = React.useId();

  const contextValue = React.useMemo<ComboboxContextValue>(
    () => ({ selectedValue: selectedValue ?? null, onSelect: handleSelect }),
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
      const listProps = {
        emptyMessage: loading ? loadingMessage : emptyMessage,
        ...(listMaxWidth ? { maxWidth: listMaxWidth } : undefined),
      } satisfies ComboboxListProps;

      return (
        <>
          <CommandInput placeholder={searchPlaceholder} />
          <ComboboxList {...listProps}>
            {!loading &&
              Array.from(groupedOptions.entries()).map(([group, opts]) => (
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
          </ComboboxList>
        </>
      );
    }
    return children;
  };

  const rootStyle = {
    ...style,
    ...comboboxSizeTokens[normalizedSize],
    ...(width ? { "--combobox-width": toCssLength(width) } : undefined),
  } satisfies ComboboxStyle;

  return (
    <ComboboxContext.Provider value={contextValue}>
      <div
        className={cn("flex w-[var(--combobox-width,100%)] flex-col gap-1.5", className)}
        style={rootStyle}
        {...props}
      >
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
              aria-label={!label ? (ariaLabel ?? placeholder) : undefined}
              aria-invalid={isErrored || undefined}
              data-invalid={isErrored || undefined}
              disabled={disabled}
              className={cn(comboboxTriggerVariants({ size: normalizedSize, error: isErrored }))}
            >
              <span className={cn(!selectedValue && "text-muted-foreground")}>
                {selectedValue ? selectedLabel : placeholder}
              </span>
              <ChevronsUpDown aria-hidden="true" className="h-4 w-4 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0"
            style={{
              width: "var(--combobox-width, var(--radix-popover-trigger-width))",
              maxWidth: listMaxWidth ? toCssLength(listMaxWidth) : undefined,
            }}
          >
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
 *   <Combobox.List emptyMessage="Nothing here.">
 *     <Combobox.Group heading="Frontend">
 *       <Combobox.Option value="next">Next.js</Combobox.Option>
 *       <Combobox.Option value="remix">Remix</Combobox.Option>
 *     </Combobox.Group>
 *   </Combobox.List>
 * </Combobox>
 * ```
 */
const Combobox = Object.assign(ComboboxRoot, {
  Input: ComboboxInput,
  List: ComboboxList,
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
  ComboboxList,
  ComboboxOptionItem,
  ComboboxRoot,
  ComboboxSeparator,
};
