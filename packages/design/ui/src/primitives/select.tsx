"use client";

import { Select as BaseSelect, type SelectRoot } from "@base-ui/react/select";
import { Check, ChevronDown } from "@nebutra/icons";
import * as React from "react";

import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { type SelectSize, selectTokens } from "../tokens/components/select";
import { cn } from "../utils/cn";
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

function getSelectTriggerStyle(size: SelectSize, style: unknown): SelectTriggerCssVars {
  const token = selectTokens.sizes[size];

  return {
    "--select-height": `${token.height}px`,
    "--select-padding-x": `${token.paddingX}px`,
    "--select-font-size": `${token.fontSize}px`,
    "--select-radius": `${token.radius}px`,
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
  variant?: SelectVariant;
  options?: readonly SelectOption[];
  label?: string;
  placeholder?: string;
  size?: SelectSize;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: string;
  children?: React.ReactNode;
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
};

export type SelectProps = OptionsSelectProps | CompoundSelectProps;

function getNativeSelectStyle(size: SelectSize, style: unknown): NativeSelectCssVars {
  const token = selectTokens.sizes[size];

  return {
    "--select-height": `${token.height}px`,
    "--select-padding-x": `${token.paddingX}px`,
    "--select-font-size": `${token.fontSize}px`,
    "--select-radius": `${token.radius}px`,
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
    "--select-content-radius": `${selectTokens.content.radius}px`,
    "--select-content-shadow": selectTokens.content.shadow,
    "--select-font-size": `${selectTokens.content.fontSize}px`,
    "--select-duration": `${selectTokens.motion.duration}ms`,
    "--select-easing": selectTokens.motion.easing,
    "--select-item-radius": `${selectTokens.item.radius}px`,
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
          className="text-[length:var(--select-label-size)] font-medium text-foreground capitalize"
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
            "bg-background text-[length:var(--select-font-size)] text-foreground shadow-xs outline-none",
            "transition-[background-color,border-color,box-shadow,color] duration-[var(--select-duration)] ease-[var(--select-easing)]",
            formControlFocusClassNames.select,
            "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
            formControlInvalidClassNames.select,
            variant === "ghost" ? "border-transparent bg-transparent shadow-none" : "border-input",
            prefix
              ? "pl-[calc(var(--select-icon-inset)+var(--select-icon-box-size))]"
              : "pl-[var(--select-padding-x)]",
            hasAffix
              ? "pr-[calc(var(--select-icon-inset)+var(--select-icon-box-size))]"
              : "pr-[var(--select-padding-x)]",
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
          <span className="pointer-events-none absolute left-[var(--select-icon-inset)] inline-flex size-[var(--select-icon-box-size)] items-center justify-center">
            {prefix}
          </span>
        )}
        <span className="pointer-events-none absolute right-[var(--select-icon-inset)] inline-flex size-[var(--select-icon-box-size)] items-center justify-center">
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
          className="text-[length:var(--select-label-size)] font-medium text-foreground capitalize"
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
          <span className="pointer-events-none absolute left-[var(--select-icon-inset)] z-10 inline-flex size-[var(--select-icon-box-size)] items-center justify-center">
            {prefix}
          </span>
        )}
        <BaseSelect.Root
          value={current || null}
          onValueChange={handleValueChange}
          disabled={disabled}
          items={items}
        >
          <SelectTrigger
            id={selectId}
            size={size}
            data-testid={dataTestId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-labelledby={labelId}
            className={cn(
              variant === "ghost" && "border-transparent bg-transparent shadow-none",
              prefix && "pl-[calc(var(--select-icon-inset)+var(--select-icon-box-size))]",
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
        </BaseSelect.Root>
        {suffix && (
          <span className="pointer-events-none absolute right-[var(--select-icon-inset)] z-10 inline-flex size-[var(--select-icon-box-size)] items-center justify-center">
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
  return <BaseSelect.Root {...rootProps} />;
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

const SelectValue = ({
  className,
  placeholder,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseSelect.Value> & { placeholder?: React.ReactNode } & {
  ref?: React.Ref<HTMLSpanElement> | undefined;
}) => {
  return (
    <BaseSelect.Value ref={ref} className={cn("truncate", className)} {...props}>
      {children ||
        ((value: string | string[] | null) => {
          if (Array.isArray(value)) return value.length ? value.join(", ") : placeholder;
          return value || placeholder;
        })}
    </BaseSelect.Value>
  );
};
SelectValue.displayName = "SelectValue";

const SelectTrigger = ({
  className,
  children,
  size = "medium",
  style,
  ref,
  ...props
}: Omit<React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger>, "size"> & {
  size?: SelectSize;
} & { ref?: React.Ref<HTMLButtonElement> | undefined }) => (
  <BaseSelect.Trigger
    ref={ref}
    className={cn(
      "flex h-[var(--select-height)] w-full items-center justify-between whitespace-nowrap rounded-[var(--select-radius)] border border-input bg-background",
      "px-[var(--select-padding-x)] text-[length:var(--select-font-size)] text-foreground shadow-xs",
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
      <ChevronDown className="h-4 w-4 opacity-50" />
    </BaseSelect.Icon>
  </BaseSelect.Trigger>
);
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = ({
  ref: _ref,
}: React.ComponentPropsWithoutRef<"div"> & { ref?: React.Ref<HTMLDivElement> | undefined }) => null;
SelectScrollUpButton.displayName = "SelectScrollUpButton";

const SelectScrollDownButton = ({
  ref: _ref,
}: React.ComponentPropsWithoutRef<"div"> & { ref?: React.Ref<HTMLDivElement> | undefined }) => null;
SelectScrollDownButton.displayName = "SelectScrollDownButton";

const SelectContent = ({
  className,
  children,
  position = "popper",
  style,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseSelect.Popup> & {
  position?: "item-aligned" | "popper";
} & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <BaseSelect.Portal>
    <BaseSelect.Positioner
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
      "relative flex w-full cursor-pointer select-none items-center rounded-[var(--select-item-radius)] py-[var(--select-item-padding-y)] pl-[var(--select-item-padding-x)] pr-[calc(var(--select-item-indicator-inset)+var(--select-item-indicator-size)+var(--select-item-padding-x))] text-[length:var(--select-font-size)] outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute right-[var(--select-item-indicator-inset)] flex size-[var(--select-item-indicator-size)] items-center justify-center">
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
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
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
