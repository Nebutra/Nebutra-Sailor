"use client";

import { Select as BaseSelect, type SelectRoot } from "@base-ui/react/select";
import { Check, ChevronDown } from "@nebutra/icons";
import { usePortalContainer } from "@nebutra/ui/utils/portal-container";
import * as React from "react";
import {
  type ControlStep,
  controlFontSize,
  controlHeight,
  fieldRadius,
} from "../tokens/components/control-ladder";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { type SelectSize, selectTokens } from "../tokens/components/select";
import { cn } from "../utils/cn";
import {
  BaseDirectionScope,
  mergeRefs,
  type TextDirection,
  useTriggerDirection,
} from "../utils/direction";
import { asPlainStyle } from "../utils/primitive-props";
import { ErrorMessage } from "./error-message";
import { formControlFocusClassNames, formControlInvalidClassNames } from "./form-control";
import { Label } from "./label";

type SelectTriggerCssVars = React.CSSProperties & {
  "--select-height"?: string;
  "--select-padding-x"?: string;
  "--select-font-size"?: string;
  "--select-radius"?: string;
  "--select-focus-ring-width"?: string;
};

/** Select's four sizes on the shared control ladder — xsmall is the 24px step. */
const SELECT_STEP: Record<SelectSize, ControlStep> = {
  xsmall: "tiny",
  small: "sm",
  medium: "md",
  large: "lg",
};

/**
 * Trigger size variables, read from the control ladder so a Select sits at the
 * same height and corner as the Input and Button beside it under every
 * language (see tokens/components/control-ladder.ts).
 *
 * The global unlayered :focus-visible rule matches this button trigger and
 * outranks outline-none in the utilities layer. Keep outline inline so the
 * tokenized formControlFocusClassNames.select ring is the sole focus indicator;
 * the trigger has no nested buttons whose focus would be hidden.
 */
function getSelectTriggerStyle(size: SelectSize, style: unknown): SelectTriggerCssVars {
  const token = selectTokens.sizes[size];
  const step = SELECT_STEP[size];

  return {
    "--select-height": controlHeight(step, token.height),
    "--select-padding-x": `${token.paddingX}px`,
    "--select-font-size": controlFontSize(step, token.fontSize),
    "--select-radius": fieldRadius(token.radius),
    "--select-focus-ring-width": `${selectTokens.focusRingWidth}px`,
    borderRadius: "var(--select-radius)",
    outline: "none",
    ...asPlainStyle(style),
  };
}

type NativeSelectCssVar =
  | "--select-height"
  | "--select-padding-x"
  | "--select-font-size"
  | "--select-radius"
  | "--select-icon-inset"
  | "--select-icon-box-size"
  | "--select-icon-size"
  | "--select-label-size"
  | "--select-focus-ring-width"
  | "--select-field-gap"
  | "--select-message-gap"
  | "--select-duration"
  | "--select-easing";

type NativeSelectCssVars = React.CSSProperties & Record<NativeSelectCssVar, string>;

type SelectContentCssVars = React.CSSProperties & {
  "--select-content-max-height"?: string;
  "--select-content-min-width"?: string;
  "--select-content-padding"?: string;
  "--select-content-radius"?: string;
  "--select-content-shadow"?: string;
  "--select-font-size"?: string;
  "--select-duration"?: string;
  "--select-easing"?: string;
  "--select-item-radius"?: string;
  "--select-item-padding-x"?: string;
  "--select-item-padding-y"?: string;
  "--select-item-indicator-inset"?: string;
  "--select-item-indicator-size"?: string;
  "--select-item-indicator-icon-size"?: string;
};

export type SelectVariant = "default" | "ghost";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface OptionsSelectProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    "children" | "size" | "prefix" | "onChange"
  > {
  /**
   * Explicit OS-native `<select>`. Prefer the default listbox.
   * Only use when a true native control is required (rare).
   */
  native?: boolean;
  /** Visual treatment of the select trigger or native control. */
  variant?: SelectVariant;
  /** Options rendered by the convenience select API. */
  options?: readonly SelectOption[];
  /** Visible label associated with the select control. */
  label?: string;
  /** Placeholder shown before a value is selected. */
  placeholder?: string;
  /**
   * Control size on the shared form-control ladder.
   * @default "medium"
   */
  size?: SelectSize;
  /** Decorative content rendered before the selected value. */
  prefix?: React.ReactNode;
  /** Trailing decoration; in native mode it replaces the default chevron. */
  suffix?: React.ReactNode;
  /** Validation message rendered below the control. */
  error?: string;
  /** Option elements for the convenience API; native mode also accepts optgroup elements. */
  children?: React.ReactNode;
  /** Classes applied to the wrapper around the control and its label/message. */
  wrapperClassName?: string;
  /** HTML-select-compatible change handler (value on event.target.value). */
  onChange?: (event: { target: { value: string; name?: string } }) => void;
  /** Listbox value change (preferred). */
  onValueChange?: (value: string | null) => void;
}

/** @deprecated Use OptionsSelectProps — native is opt-in only. */
export type NativeSelectProps = OptionsSelectProps & { native?: true };

export type CompoundSelectProps = SelectRoot.Props<string, false> & {
  native?: false;
  /**
   * Reading direction of the listbox. Leave it out to follow the `dir` in effect around the
   * trigger (an ancestor `dir` attribute, else CSS `direction`).
   * @default "the direction around the trigger"
   */
  dir?: TextDirection;
};

export type SelectProps = OptionsSelectProps | CompoundSelectProps;

function getNativeSelectStyle(size: SelectSize, style: unknown): NativeSelectCssVars {
  const token = selectTokens.sizes[size];
  const step = SELECT_STEP[size];

  return {
    "--select-height": controlHeight(step, token.height),
    "--select-padding-x": `${token.paddingX}px`,
    "--select-font-size": controlFontSize(step, token.fontSize),
    "--select-radius": fieldRadius(token.radius),
    "--select-icon-inset": `${token.iconInset}px`,
    "--select-icon-box-size": `${token.iconBoxSize}px`,
    "--select-icon-size": `${token.iconSize}px`,
    "--select-label-size": `${selectTokens.labelSize}px`,
    "--select-focus-ring-width": `${selectTokens.focusRingWidth}px`,
    "--select-field-gap": `${selectTokens.fieldGap}px`,
    "--select-message-gap": `${selectTokens.messageGap}px`,
    "--select-duration": `${selectTokens.motion.duration}ms`,
    "--select-easing": selectTokens.motion.easing,
    ...asPlainStyle(style),
  };
}

function getSelectContentStyle(style: unknown): SelectContentCssVars {
  return {
    "--select-content-max-height": `${selectTokens.content.maxHeight}px`,
    "--select-content-min-width": `${selectTokens.content.minWidth}px`,
    "--select-content-padding": `${selectTokens.content.padding}px`,
    // The menu-family corner (dropdown, popover, combobox list): the
    // container step, which a Brand Package maps to its card radius. It was a
    // fixed 12px while every other menu was 6px.
    "--select-content-radius": "var(--radius-lg, 0.5rem)",
    "--select-content-shadow": selectTokens.content.shadow,
    "--select-font-size": `${selectTokens.content.fontSize}px`,
    "--select-duration": `${selectTokens.motion.duration}ms`,
    "--select-easing": selectTokens.motion.easing,
    "--select-item-radius": "var(--radius-sm, 0.25rem)",
    "--select-item-padding-x": `${selectTokens.item.paddingX}px`,
    "--select-item-padding-y": `${selectTokens.item.paddingY}px`,
    "--select-item-indicator-inset": `${selectTokens.item.indicatorInset}px`,
    "--select-item-indicator-size": `${selectTokens.item.indicatorSize}px`,
    "--select-item-indicator-icon-size": `${selectTokens.item.indicatorIconSize}px`,
    zIndex: overlayZIndex.popover,
    ...asPlainStyle(style),
  };
}

function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return textOf(props.children);
  }
  return "";
}

type SelectDirectionValue = {
  /** Ref callback for the trigger the reading direction is measured from. */
  triggerRef: React.RefCallback<Element>;
  /** Reading direction applied to the listbox and handed to Base UI for `inline-*` sides. */
  direction: TextDirection;
};

// Undefined outside a Select so a stray SelectContent never forces `dir` onto the page.
const SelectDirectionContext = React.createContext<SelectDirectionValue | undefined>(undefined);

/**
 * Measures the reading direction around the trigger and shares it with the listbox, which renders
 * in a portal outside the trigger's `dir` subtree. Wraps `BaseSelect.Root`.
 */
function SelectDirectionScope({
  dir,
  children,
}: {
  dir?: TextDirection | undefined;
  children: React.ReactNode;
}) {
  const { triggerRef, direction } = useTriggerDirection(dir);
  const value = React.useMemo(() => ({ triggerRef, direction }), [triggerRef, direction]);
  return (
    <SelectDirectionContext.Provider value={value}>
      <BaseDirectionScope direction={direction}>{children}</BaseDirectionScope>
    </SelectDirectionContext.Provider>
  );
}

function optionsFromChildren(children: React.ReactNode): SelectOption[] {
  const options: SelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type !== "option") return;
    const props = child.props as {
      value?: string | number;
      disabled?: boolean;
      children?: React.ReactNode;
    };
    const value = String(props.value ?? "");
    const label = textOf(props.children) || value;
    options.push(props.disabled === true ? { value, label, disabled: true } : { value, label });
  });
  return options;
}

function hasNativeOptionChildren(children: React.ReactNode) {
  let hasNativeChildren = false;
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === "option" || child.type === "optgroup") {
      hasNativeChildren = true;
    }
  });
  return hasNativeChildren;
}

/** Convenience surface (options / label / HTML onChange) — not compound Trigger children. */
function isOptionsSelectApi(props: SelectProps): props is OptionsSelectProps {
  if (props.native === true) return false;
  if ("options" in props && props.options !== undefined) return true;
  if ("label" in props && props.label !== undefined) return true;
  if ("placeholder" in props && props.placeholder !== undefined) return true;
  if ("error" in props && props.error !== undefined) return true;
  if ("prefix" in props && props.prefix !== undefined) return true;
  if ("suffix" in props && props.suffix !== undefined) return true;
  if ("onChange" in props && typeof (props as OptionsSelectProps).onChange === "function") {
    return true;
  }
  if ("children" in props && hasNativeOptionChildren(props.children)) return true;
  return false;
}

/** OS-native path — opt-in only via native={true}. */
function NativeSelect({
  id,
  variant = "default",
  options,
  label,
  placeholder,
  size = "medium",
  prefix,
  suffix,
  disabled = false,
  error,
  className,
  wrapperClassName,
  children,
  style,
  value,
  defaultValue,
  onChange,
  "aria-describedby": ariaDescribedBy,
  ...props
}: OptionsSelectProps) {
  const generatedId = React.useId();
  const selectId = id ?? generatedId;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(" ") || undefined;
  const fallbackDefaultValue =
    placeholder && value === undefined && defaultValue === undefined ? "" : defaultValue;
  const hasAffix = Boolean(prefix || suffix);
  const nativeSelectStyle = getNativeSelectStyle(size, style);

  return (
    <div
      className={cn("grid gap-[var(--select-field-gap)]", wrapperClassName)}
      style={nativeSelectStyle}
    >
      {label && (
        <Label
          htmlFor={selectId}
          className="text-[length:var(--select-label-size)] font-medium text-foreground"
        >
          {label}
        </Label>
      )}
      <div
        className={cn(
          "relative flex items-center text-muted-foreground",
          !disabled && "hover:text-foreground",
        )}
      >
        <select
          id={selectId}
          disabled={disabled}
          value={value}
          defaultValue={fallbackDefaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          style={{ borderRadius: "var(--select-radius)" }}
          className={cn(
            "h-[var(--select-height)] w-full appearance-none rounded-[var(--select-radius)] border font-sans",
            "bg-background text-[length:var(--select-font-size)] text-foreground outline-none",
            "transition-[background-color,border-color,box-shadow,color] duration-[var(--select-duration)] ease-[var(--select-easing)]",
            formControlFocusClassNames.select,
            "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
            formControlInvalidClassNames.select,
            variant === "ghost" ? "border-transparent bg-transparent shadow-none" : "border-input",
            prefix
              ? "ps-[calc(var(--select-icon-inset)+var(--select-icon-box-size))]"
              : "ps-[var(--select-padding-x)]",
            hasAffix
              ? "pe-[calc(var(--select-icon-inset)+var(--select-icon-box-size))]"
              : "pe-[var(--select-padding-x)]",
            className,
          )}
          onChange={(event) => onChange?.(event)}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options?.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
        {prefix && (
          <span className="pointer-events-none absolute start-[var(--select-icon-inset)] inline-flex size-[var(--select-icon-box-size)] items-center justify-center">
            {prefix}
          </span>
        )}
        <span className="pointer-events-none absolute end-[var(--select-icon-inset)] inline-flex size-[var(--select-icon-box-size)] items-center justify-center">
          {suffix ?? <ChevronDown aria-hidden="true" className="size-[var(--select-icon-size)]" />}
        </span>
      </div>
      {error && (
        <span id={errorId} className="mt-[var(--select-message-gap)]">
          <ErrorMessage size={size === "large" ? "medium" : "small"}>{error}</ErrorMessage>
        </span>
      )}
    </div>
  );
}

/**
 * Default convenience Select: DS listbox (styled popup), not OS chrome.
 * Accepts options / label / placeholder / HTML-compatible onChange.
 */
function OptionsListboxSelect({
  id,
  variant = "default",
  options: optionsProp,
  label,
  placeholder,
  size = "medium",
  prefix,
  suffix,
  disabled = false,
  error,
  className,
  wrapperClassName,
  children,
  style,
  value,
  defaultValue,
  name,
  onChange,
  onValueChange,
  dir,
  "aria-describedby": ariaDescribedBy,
  "data-testid": dataTestId,
}: OptionsSelectProps & { "data-testid"?: string }) {
  const generatedId = React.useId();
  const selectId = id ?? generatedId;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(" ") || undefined;
  const labelId = label ? `${selectId}-label` : undefined;

  const options = React.useMemo(() => {
    const fromProp = optionsProp?.map((o) => ({
      value: String(o.value),
      label: o.label,
      ...(o.disabled === true ? { disabled: true as const } : {}),
    }));
    if (fromProp?.length) return fromProp;
    return optionsFromChildren(children);
  }, [optionsProp, children]);

  const items = React.useMemo(
    () => Object.fromEntries(options.map((o) => [o.value, o.label])),
    [options],
  );

  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = React.useState(() =>
    defaultValue !== undefined ? String(defaultValue) : "",
  );
  const current = isControlled ? String(value ?? "") : uncontrolled;
  const selectedLabel = (current && items[current]) || current || "";

  const handleValueChange = (next: string | null) => {
    const resolved = next ?? "";
    if (!isControlled) setUncontrolled(resolved);
    onValueChange?.(next);
    onChange?.({
      target: name === undefined ? { value: resolved } : { value: resolved, name },
    });
  };

  const fieldStyle = getNativeSelectStyle(size, style);

  return (
    <div className={cn("grid gap-[var(--select-field-gap)]", wrapperClassName)} style={fieldStyle}>
      {label && (
        <Label
          id={labelId}
          htmlFor={selectId}
          className="text-[length:var(--select-label-size)] font-medium text-foreground"
        >
          {label}
        </Label>
      )}
      {name ? <input type="hidden" name={name} value={current} data-allow-native /> : null}
      <div
        className={cn(
          "relative flex items-center text-muted-foreground",
          !disabled && "hover:text-foreground",
        )}
      >
        {prefix && (
          <span className="pointer-events-none absolute start-[var(--select-icon-inset)] z-10 inline-flex size-[var(--select-icon-box-size)] items-center justify-center">
            {prefix}
          </span>
        )}
        <BaseSelect.Root
          value={current || null}
          onValueChange={handleValueChange}
          disabled={disabled}
          items={items}
        >
          <SelectDirectionScope dir={dir === "rtl" || dir === "ltr" ? dir : undefined}>
            <SelectTrigger
              id={selectId}
              size={size}
              data-testid={dataTestId}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              aria-labelledby={labelId}
              className={cn(
                variant === "ghost" && "border-transparent bg-transparent shadow-none",
                prefix && "ps-[calc(var(--select-icon-inset)+var(--select-icon-box-size))]",
                className,
              )}
            >
              <SelectValue placeholder={placeholder ?? "Select…"}>
                {() => selectedLabel || placeholder || "Select…"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectDirectionScope>
        </BaseSelect.Root>
        {suffix && (
          <span className="pointer-events-none absolute end-[var(--select-icon-inset)] z-10 inline-flex size-[var(--select-icon-box-size)] items-center justify-center">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <span id={errorId} className="mt-[var(--select-message-gap)]">
          <ErrorMessage size={size === "large" ? "medium" : "small"}>{error}</ErrorMessage>
        </span>
      )}
    </div>
  );
}

/**
 * Value → label for the compound form, read from its `SelectItem` children.
 *
 * Base UI's `Select.Value` renders the raw value unless the root is given
 * `items`, so a bare `<SelectValue />` showed `org:member`, `owner` or
 * `zh-Hans-CN` in the trigger — English identifiers in every locale. The
 * compound root now collects the labels its items already carry, and
 * `SelectValue`'s default renderer reads them.
 */
const SelectLabelsContext = React.createContext<Record<string, React.ReactNode> | null>(null);

function collectItemLabels(
  node: React.ReactNode,
  into: Record<string, React.ReactNode> = {},
): Record<string, React.ReactNode> {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as { value?: unknown; children?: React.ReactNode };
    if (child.type === SelectItem && props.value !== undefined && props.value !== null) {
      into[String(props.value)] = props.children;
      return;
    }
    if (props.children !== undefined) collectItemLabels(props.children, into);
  });
  return into;
}

function CompoundSelectRoot(props: Omit<CompoundSelectProps, "native">) {
  const { children, dir, ...rootProps } = props;
  const labels = React.useMemo(() => collectItemLabels(children), [children]);
  return (
    <SelectLabelsContext.Provider value={labels}>
      <SelectDirectionScope dir={dir}>
        <BaseSelect.Root {...rootProps}>{children}</BaseSelect.Root>
      </SelectDirectionScope>
    </SelectLabelsContext.Provider>
  );
}

/**
 * Selects one option through the styled listbox API, with an opt-in native path
 * and a compound form for composing SelectTrigger and SelectItem.
 */
function Select(props: OptionsSelectProps): React.JSX.Element;
function Select(props: CompoundSelectProps): React.JSX.Element;
function Select(props: SelectProps): React.JSX.Element {
  if (props.native === true) {
    return <NativeSelect {...(props as OptionsSelectProps)} />;
  }

  if (isOptionsSelectApi(props)) {
    return <OptionsListboxSelect {...(props as OptionsSelectProps)} />;
  }

  const { native: _native, ...rootProps } = props as CompoundSelectProps;
  return <CompoundSelectRoot {...rootProps} />;
}

Select.displayName = "Select";

const SelectGroup = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseSelect.Group> & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => <BaseSelect.Group ref={ref} className={cn("p-1", className)} {...props} />;
SelectGroup.displayName = "SelectGroup";

/** Displays the selected option label or a placeholder inside SelectTrigger. */
const SelectValue = ({
  className,
  placeholder,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseSelect.Value> & {
  /** Content displayed when there is no selected value. */
  placeholder?: React.ReactNode;
} & {
  ref?: React.Ref<HTMLSpanElement> | undefined;
}) => {
  const labels = React.use(SelectLabelsContext);
  const labelOf = (value: string) => labels?.[value] ?? value;
  return (
    <BaseSelect.Value ref={ref} className={cn("truncate", className)} {...props}>
      {children ||
        ((value: string | string[] | null) => {
          if (Array.isArray(value))
            return value.length
              ? value.map((v) => textOf(labelOf(v)) || v).join(", ")
              : placeholder;
          return value ? labelOf(value) : placeholder;
        })}
    </BaseSelect.Value>
  );
};
SelectValue.displayName = "SelectValue";

/** Opens the option list and displays the current value for a Select root. */
const SelectTrigger = ({
  className,
  children,
  size = "medium",
  style,
  ref,
  ...props
}: Omit<React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger>, "size"> & {
  /** Control size on the shared form-control ladder. @default "medium" */
  size?: SelectSize;
} & { ref?: React.Ref<HTMLButtonElement> | undefined }) => {
  const directionTriggerRef = React.use(SelectDirectionContext)?.triggerRef;
  // Memoised: a fresh callback ref every render would detach and re-register the trigger in Base UI.
  const mergedRef = React.useMemo(
    () => mergeRefs<HTMLButtonElement>(ref, directionTriggerRef),
    [ref, directionTriggerRef],
  );
  return (
    <BaseSelect.Trigger
      ref={mergedRef}
      className={cn(
        "flex h-[var(--select-height)] w-full min-w-0 items-center justify-between gap-2 whitespace-nowrap rounded-[var(--select-radius)] border border-input bg-background",
        "px-[var(--select-padding-x)] text-[length:var(--select-font-size)] text-foreground",
        "transition-[background-color,border-color,box-shadow,color] duration-micro ease-out placeholder:text-muted-foreground",
        formControlFocusClassNames.select,
        "disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        formControlInvalidClassNames.select,
        className,
      )}
      style={getSelectTriggerStyle(size, style)}
      {...props}
    >
      {children}
      <BaseSelect.Icon render={<span />}>
        <ChevronDown className="size-4 shrink-0 opacity-50" />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
};
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = ({
  ref: _ref,
}: React.ComponentPropsWithoutRef<"div"> & { ref?: React.Ref<HTMLDivElement> | undefined }) => null;
SelectScrollUpButton.displayName = "SelectScrollUpButton";

const SelectScrollDownButton = ({
  ref: _ref,
}: React.ComponentPropsWithoutRef<"div"> & { ref?: React.Ref<HTMLDivElement> | undefined }) => null;
SelectScrollDownButton.displayName = "SelectScrollDownButton";

/** Portals the styled option list and positions it relative to SelectTrigger. */
const SelectContent = ({
  className,
  children,
  position = "popper",
  container,
  style,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseSelect.Popup> & {
  /** Aligns the popup to the trigger or to the selected item. @default "popper" */
  position?: "item-aligned" | "popper";
  /** Portal target; defaults to the nearest portal scope or document.body. */
  container?: React.ComponentProps<typeof BaseSelect.Portal>["container"];
} & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const portalContainer = usePortalContainer(container);
  const direction = React.use(SelectDirectionContext)?.direction;
  return (
    <BaseSelect.Portal container={portalContainer}>
      <BaseSelect.Positioner
        dir={direction}
        // z-index on the positioned element — the Popup inside is static, so a
        // z-index there is ignored and any z-10 layer on the page covers the list.
        style={{ zIndex: overlayZIndex.popover }}
        alignItemWithTrigger={position === "item-aligned"}
        sideOffset={selectTokens.content.sideOffset}
      >
        <BaseSelect.Popup
          ref={ref}
          className={cn("relative", overlayClassNames.selectSurface, className)}
          style={getSelectContentStyle(style)}
          {...props}
        >
          <BaseSelect.List className="h-full w-full p-[var(--select-content-padding)]">
            {children}
          </BaseSelect.List>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
};
SelectContent.displayName = "SelectContent";

const SelectLabel = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseSelect.GroupLabel> & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <BaseSelect.GroupLabel
    ref={ref}
    className={cn(
      "px-[var(--select-item-padding-x)] py-[var(--select-item-padding-y)] text-[length:var(--select-font-size)] font-semibold",
      className,
    )}
    {...props}
  />
);
SelectLabel.displayName = "SelectLabel";

/** Renders one selectable option inside SelectContent. */
const SelectItem = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseSelect.Item> & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <BaseSelect.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-[var(--select-item-radius)] py-[var(--select-item-padding-y)] ps-[var(--select-item-padding-x)] pe-[calc(var(--select-item-indicator-inset)+var(--select-item-indicator-size)+var(--select-item-padding-x))] text-[length:var(--select-font-size)] outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute end-[var(--select-item-indicator-inset)] flex size-[var(--select-item-indicator-size)] items-center justify-center">
      <BaseSelect.ItemIndicator render={<span />}>
        <Check className="size-[var(--select-item-indicator-icon-size)]" />
      </BaseSelect.ItemIndicator>
    </span>
    <BaseSelect.ItemText render={<span />}>{children}</BaseSelect.ItemText>
  </BaseSelect.Item>
);
SelectItem.displayName = "SelectItem";

const SelectSeparator = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <BaseSelect.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
);
SelectSeparator.displayName = "SelectSeparator";

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
