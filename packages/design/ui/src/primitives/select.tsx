"use client";

import { Select as BaseSelect, type SelectRoot } from "@base-ui/react/select";
import { Check, ChevronDown } from "@nebutra/icons";
import * as React from "react";

import { type SelectSize, selectTokens } from "../tokens/components/select";
import { cn } from "../utils/cn";
import { ErrorMessage } from "./error-message";
import { Label } from "./label";

type SelectTriggerCssVars = React.CSSProperties & {
  "--select-height"?: string;
  "--select-padding-x"?: string;
  "--select-font-size"?: string;
  "--select-radius"?: string;
  "--select-focus-ring-width"?: string;
};

function getSelectTriggerStyle(
  size: SelectSize,
  style: React.CSSProperties | undefined,
): SelectTriggerCssVars {
  const token = selectTokens.sizes[size];

  return {
    "--select-height": `${token.height}px`,
    "--select-padding-x": `${token.paddingX}px`,
    "--select-font-size": `${token.fontSize}px`,
    "--select-radius": `${token.radius}px`,
    "--select-focus-ring-width": `${selectTokens.focusRingWidth}px`,
    borderRadius: "var(--select-radius)",
    outline: "none",
    ...style,
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

export type SelectVariant = "default" | "ghost";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface NativeSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children" | "size" | "prefix"> {
  native?: true;
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
}

export type CompoundSelectProps = SelectRoot.Props<string, false> & {
  native?: false;
};

export type SelectProps = NativeSelectProps | CompoundSelectProps;

function getNativeSelectStyle(
  size: SelectSize,
  style: React.CSSProperties | undefined,
): NativeSelectCssVars {
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
    ...style,
  };
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

function shouldRenderNativeSelect(props: SelectProps) {
  if (props.native === true) return true;
  if ("options" in props || "label" in props || "placeholder" in props || "error" in props) {
    return true;
  }
  if ("prefix" in props || "suffix" in props || "size" in props || "onChange" in props) {
    return true;
  }
  if ("children" in props && hasNativeOptionChildren(props.children)) {
    return true;
  }

  return false;
}

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
  "aria-describedby": ariaDescribedBy,
  ...props
}: NativeSelectProps) {
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
          style={{ borderRadius: "var(--select-radius)", outline: "none" }}
          className={cn(
            "h-[var(--select-height)] w-full appearance-none rounded-[var(--select-radius)] border font-sans",
            "bg-background text-[length:var(--select-font-size)] text-foreground shadow-[var(--shadow-xs)] outline-none",
            "transition-[background-color,border-color,box-shadow,color] duration-[var(--select-duration)] ease-[var(--select-easing)]",
            "focus:border-ring focus:ring-[length:var(--select-focus-ring-width)] focus:ring-ring/30",
            "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
            "aria-invalid:border-destructive/60 aria-invalid:focus:border-destructive aria-invalid:focus:ring-destructive/20",
            variant === "ghost" ? "border-transparent bg-transparent shadow-none" : "border-input",
            prefix
              ? "pl-[calc(var(--select-icon-inset)+var(--select-icon-box-size))]"
              : "pl-[var(--select-padding-x)]",
            hasAffix
              ? "pr-[calc(var(--select-icon-inset)+var(--select-icon-box-size))]"
              : "pr-[var(--select-padding-x)]",
            className,
          )}
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

function Select(props: SelectProps) {
  if (shouldRenderNativeSelect(props)) {
    return <NativeSelect {...(props as NativeSelectProps)} />;
  }

  const { native: _native, ...rootProps } = props as CompoundSelectProps;
  return <BaseSelect.Root {...rootProps} />;
}

Select.displayName = "Select";

const SelectGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Group>
>(({ className, ...props }, ref) => (
  <BaseSelect.Group ref={ref} className={cn("p-1", className)} {...props} />
));
SelectGroup.displayName = "SelectGroup";

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Value> & { placeholder?: React.ReactNode }
>(({ className, placeholder, children, ...props }, ref) => {
  return (
    <BaseSelect.Value ref={ref} className={cn("truncate", className)} {...props}>
      {children ||
        ((value: string | string[] | null) => {
          if (Array.isArray(value)) return value.length ? value.join(", ") : placeholder;
          return value || placeholder;
        })}
    </BaseSelect.Value>
  );
});
SelectValue.displayName = "SelectValue";

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger>, "size"> & { size?: SelectSize }
>(({ className, children, size = "medium", style, ...props }, ref) => (
  <BaseSelect.Trigger
    ref={ref}
    className={cn(
      "flex h-[var(--select-height)] w-full items-center justify-between whitespace-nowrap rounded-[var(--select-radius)] border border-input bg-background",
      "px-[var(--select-padding-x)] text-[length:var(--select-font-size)] text-foreground shadow-[var(--shadow-xs)]",
      "transition-[background-color,border-color,box-shadow,color] duration-micro ease-out placeholder:text-muted-foreground",
      "outline-none focus:border-ring focus:ring-[length:var(--select-focus-ring-width)] focus:ring-ring/30",
      "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive/60 aria-invalid:focus:border-destructive aria-invalid:focus:ring-destructive/20 [&>span]:line-clamp-1",
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
));
SelectTrigger.displayName = "SelectTrigger";

// Mocking ScrollUp/Down since Base UI usually handles scrolling natively with CSS or uses different abstractions.
// Returning null prevents API breakages for downstream consumers.
const SelectScrollUpButton = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>((_props, _ref) => null);
SelectScrollUpButton.displayName = "SelectScrollUpButton";

const SelectScrollDownButton = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>((_props, _ref) => null);
SelectScrollDownButton.displayName = "SelectScrollDownButton";

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Popup> & {
    position?: "item-aligned" | "popper";
  }
>(({ className, children, position: _position = "popper", ...props }, ref) => (
  <BaseSelect.Portal>
    <BaseSelect.Positioner sideOffset={4}>
      <BaseSelect.Popup
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-32 overflow-hidden rounded-xl border bg-background/90 backdrop-blur-md text-popover-foreground shadow-xl outline-none transition-[opacity,transform,display] duration-200 data-starting-style:animate-in data-starting-style:fade-in-0 data-starting-style:zoom-in-95 data-ending-style:animate-out data-ending-style:fade-out-0 data-ending-style:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      >
        <div className="p-1 h-full w-full">{children}</div>
      </BaseSelect.Popup>
    </BaseSelect.Positioner>
  </BaseSelect.Portal>
));
SelectContent.displayName = "SelectContent";

const SelectLabel = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold", className)} {...props} />
  ),
);
SelectLabel.displayName = "SelectLabel";

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Item>
>(({ className, children, ...props }, ref) => (
  <BaseSelect.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-[var(--radius-sm)] py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <BaseSelect.ItemIndicator render={<span />}>
        <Check className="h-4 w-4" />
      </BaseSelect.ItemIndicator>
    </span>
    <BaseSelect.ItemText render={<span />}>{children}</BaseSelect.ItemText>
  </BaseSelect.Item>
));
SelectItem.displayName = "SelectItem";

const SelectSeparator: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<"div"> & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <BaseSelect.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  ),
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
