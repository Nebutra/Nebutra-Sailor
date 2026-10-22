"use client";

import { Check, ChevronUpDown as ChevronsUpDown } from "@nebutra/icons";
import { cva } from "class-variance-authority";
import * as React from "react";
import { controlFontSize, controlHeight } from "../tokens/components/control-ladder";
import { selectTokens } from "../tokens/components/select";
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
import { formControlFocusClassNames } from "./form-control";
import { Label } from "./label";
import { Popover, PopoverContent, type PopoverPortalContainer, PopoverTrigger } from "./popover";

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

// Heights and type size from the shared control ladder, so the trigger lines up
// with Input, Select and Button under every Brand Package density.
const comboboxSizeTokens = {
  small: {
    "--combobox-trigger-height": controlHeight("sm", 32),
    "--combobox-trigger-padding-x": "0.625rem",
    "--combobox-font-size": controlFontSize("sm", 12),
  },
  medium: {
    "--combobox-trigger-height": controlHeight("md", 40),
    "--combobox-trigger-padding-x": "0.75rem",
    "--combobox-font-size": controlFontSize("md", 14),
  },
  large: {
    "--combobox-trigger-height": controlHeight("lg", 48),
    "--combobox-trigger-padding-x": "0.875rem",
    "--combobox-font-size": controlFontSize("lg", 16),
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
  /**
   * Disable the trigger and prevent the popup from being opened or closed by user interaction.
   * @default false
   */
  disabled?: boolean;
  /** Show error styling. Prefer `errored`; `error` is kept for existing consumers. */
  errored?: boolean;
  /**
   * Legacy invalid-state styling, used only when `errored` is omitted.
   * @default false
   * @deprecated Use `errored`.
   */
  error?: boolean;
  /**
   * Form-control size; legacy `sm`, `default` and `lg` values map to small, medium and large.
   * @default "medium"
   */
  size?: ComboboxSize | LegacyComboboxSize;
  /** Custom root width. Numbers are treated as pixels; strings can be CSS lengths. */
  width?: ComboboxWidth;
  /** Custom list max width. Numbers are treated as pixels; strings can be CSS lengths. */
  listMaxWidth?: ComboboxWidth;
  /** Accessible label shown above the trigger */
  label?: string;
  /**
   * Visually hide the supplied label while retaining its accessible association with the trigger.
   * @default false
   */
  hideLabel?: boolean;
  /**
   * Trigger text when no value is selected; also the accessible-name fallback without a label.
   * @default "Select..."
   */
  placeholder?: string;
  /**
   * No-results text for options mode; in composition mode configure Combobox.List instead.
   * @default "No results found."
   */
  emptyMessage?: string;
  /**
   * Search-input placeholder in options mode; configure Combobox.Input directly in composition mode.
   * @default "Search..."
   */
  searchPlaceholder?: string;
  /** Portal target for the options list; defaults to document.body. */
  container?: PopoverPortalContainer;
  /** Composition mode — children provide their own CommandInput/List/etc. */
  children?: React.ReactNode;
  /**
   * Replace options with loading copy in options mode; composition mode owns its own loading content.
   * @default false
   */
  loading?: boolean;
  /**
   * Text used in place of the options list's empty message while loading.
   * @default "Loading options..."
   */
  loadingMessage?: string;
  /** Accessible name when no visible label is rendered. */
  "aria-label"?: string;
}

type ComboboxChange =
  | {
      /** Receives the selected value, or null when the selected option is chosen again. */
      onValueChange: (value: ComboboxValue) => void;
      onChange?: never;
    }
  | {
      /** Legacy value callback; receives null when the selection is cleared. @deprecated Use `onValueChange` — `onChange` conventionally receives an event. */
      onChange: (value: ComboboxValue) => void;
      onValueChange?: never;
    };

/** Controlled: a value and exactly one change callback. */
type ControlledComboboxProps = ComboboxBaseProps & {
  /** Controlled option value; null represents no selection and requires a change callback. */
  value: ComboboxValue;
  defaultValue?: never;
} & ComboboxChange;

interface UncontrolledComboboxProps extends ComboboxBaseProps {
  /** Omit to let the combobox manage selection; use `defaultValue` for its initial state. */
  value?: never;
  /** Legacy selection callback, used only when `onValueChange` is omitted. @deprecated Use `onValueChange` — `onChange` conventionally receives an event. */
  onChange?: (value: ComboboxValue) => void;
  /** Receives the selected value, or null when choosing the current selection clears it. */
  onValueChange?: (value: ComboboxValue) => void;
  /**
   * Initial option value for an uncontrolled combobox; later changes do not reset selection.
   * @default null
   */
  defaultValue?: ComboboxValue;
}

export type ComboboxProps = ControlledComboboxProps | UncontrolledComboboxProps;

export interface ComboboxOptionProps {
  /** Unique selection key; choosing an already-selected key clears the selection. */
  value: string;
  /** Search keyword and fallback display text when children are omitted. */
  label?: string;
  /**
   * Prevent this option from being selected through the command list.
   * @default false
   */
  disabled?: boolean;
  /** Classes applied to the selectable command item. */
  className?: string;
  /** Visible option content; plain text also supplies a search keyword when no label is provided. */
  children?: React.ReactNode;
}

export type ComboboxInputProps = React.ComponentPropsWithoutRef<typeof CommandInput>;

export type ComboboxEmptyProps = React.ComponentPropsWithoutRef<typeof CommandEmpty>;

export type ComboboxGroupProps = React.ComponentPropsWithoutRef<typeof CommandGroup>;

export interface ComboboxListProps extends CommandListProps {
  /** Options, groups and separators rendered after the built-in empty-results message. */
  children?: React.ReactNode;
  /** Classes applied to the scrollable command list. */
  className?: string;
  /** Inline list styles, with `maxWidth` taking precedence over `style.maxWidth`. */
  style?: React.CSSProperties;
  /**
   * Content displayed when the command list has no matching options.
   * @default "No results found."
   */
  emptyMessage?: React.ReactNode;
  // explicit `| undefined` to accept passthrough under `exactOptionalPropertyTypes`
  /** Maximum list width in pixels for numbers, or as a CSS length string. */
  maxWidth?: ComboboxWidth | undefined;
}

// =============================================================================
// CVA Variants
// =============================================================================

export const comboboxTriggerVariants = cva(
  [
    "flex w-full items-center justify-between gap-2 whitespace-nowrap",
    // --radius-inputs, not the generic md step: this trigger is a form control and
    // should round like Input and Select do. Reading the scale step meant it
    // tracked whatever a language did to medium surfaces instead of what it
    // decided for its fields.
    "h-[var(--combobox-trigger-height)] rounded-[var(--radius-inputs,var(--radius-md))] border border-input bg-background px-[var(--combobox-trigger-padding-x)]",
    "text-[length:var(--combobox-font-size)]",
    "transition-[background-color,border-color,box-shadow,color] duration-micro ease-out",
    // The trigger is a select-like field: it takes the same border + ring as
    // Select, from the shared contract. `outline-none!` is important on
    // purpose: the unlayered global :focus-visible outline beats a plain
    // utility and would stack a second indicator on the ring.
    formControlFocusClassNames.select,
    "outline-none!",
    "placeholder:text-muted-foreground",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "[&>span]:line-clamp-1 [&>span]:text-start",
  ].join(" "),
  {
    variants: {
      size: {
        small: "",
        medium: "",
        large: "",
      },
      error: {
        true: "border-destructive",
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
  const ctx = React.use(ComboboxContext);
  if (!ctx) {
    throw new Error("Combobox sub-components must be used within <Combobox>");
  }
  return ctx;
}

// =============================================================================
// ComboboxOption (sub-component)
// =============================================================================

/** Selectable command item with a decorative selected checkmark; requires a Combobox ancestor. */
const ComboboxOptionItem = ({
  ref,
  value,
  label,
  disabled,
  className,
  children,
}: ComboboxOptionProps & { ref?: React.Ref<React.ElementRef<typeof CommandItem>> | undefined }) => {
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
};
ComboboxOptionItem.displayName = "Combobox.Option";

// =============================================================================
// ComboboxInput (sub-component)
// =============================================================================

/** Search input for composition mode; forwards input and filtering behavior to CommandInput. */
const ComboboxInput = ({
  ref,
  ...props
}: ComboboxInputProps & { ref?: React.Ref<React.ElementRef<typeof CommandInput>> | undefined }) => (
  <CommandInput ref={ref} {...props} />
);
ComboboxInput.displayName = "Combobox.Input";

// =============================================================================
// ComboboxEmpty (sub-component)
// =============================================================================

/** Custom empty-results content for a composed command list. */
const ComboboxEmpty = ({
  ref,
  ...props
}: ComboboxEmptyProps & { ref?: React.Ref<React.ElementRef<typeof CommandEmpty>> | undefined }) => (
  <CommandEmpty ref={ref} {...props} />
);
ComboboxEmpty.displayName = "Combobox.Empty";

// =============================================================================
// ComboboxGroup (sub-component)
// =============================================================================

/** Groups related options, optionally under a heading, within a composed combobox list. */
const ComboboxGroupSub = ({
  ref,
  ...props
}: ComboboxGroupProps & { ref?: React.Ref<React.ElementRef<typeof CommandGroup>> | undefined }) => (
  <CommandGroup ref={ref} {...props} />
);
ComboboxGroupSub.displayName = "Combobox.Group";

// =============================================================================
// ComboboxSeparator (sub-component)
// =============================================================================

/** Visual separator between option groups in composition mode. */
const ComboboxSeparator = CommandSeparator;

/** Scrollable options list with built-in empty-results content and an optional maximum width. */
const ComboboxList = ({
  children,
  className,
  emptyMessage = "No results found.",
  maxWidth,
  style,
  ref,
  ...props
}: ComboboxListProps & { ref?: React.Ref<React.ElementRef<typeof CommandList>> | undefined }) => {
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
};
ComboboxList.displayName = "Combobox.List";

// =============================================================================
// ComboboxRoot
// =============================================================================

function toCssLength(value: ComboboxWidth): string {
  return typeof value === "number" ? `${value}px` : value;
}

/** Searchable single selection with managed popup state and controlled or uncontrolled values. */
function ComboboxRoot({
  options,
  value: controlledValue,
  onChange: legacyOnChange,
  onValueChange: onChange = legacyOnChange,
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
  container,
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
              style={
                {
                  "--select-focus-ring-width": `${selectTokens.focusRingWidth}px`,
                } as React.CSSProperties
              }
            >
              <span className={cn(!selectedValue && "text-muted-foreground")}>
                {selectedValue ? selectedLabel : placeholder}
              </span>
              <ChevronsUpDown aria-hidden="true" className="h-4 w-4 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0"
            container={container}
            style={{
              // Base UI publishes the trigger width as --anchor-width. The
              // Radix-era variable is never set, so the list used to fall back
              // to the surface's w-72.
              width: "var(--combobox-width, var(--anchor-width))",
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
 *   onValueChange={setValue}
 *   placeholder="Select framework..."
 * />
 * ```
 *
 * @example Composition mode (manual children)
 * ```tsx
 * <Combobox value={value} onValueChange={setValue} placeholder="Search...">
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
  /** Search field for a composed combobox; provide a descriptive placeholder or accessible name. */
  Input: ComboboxInput,
  /** Scrollable option container with its own empty-results message. */
  List: ComboboxList,
  /** Selectable option; choosing the current selection again clears it. */
  Option: ComboboxOptionItem,
  /** Empty-results message for a manually composed command list. */
  Empty: ComboboxEmpty,
  /** Groups related options under an optional heading. */
  Group: ComboboxGroupSub,
  /** Visual divider between groups of options. */
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
