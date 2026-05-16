"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown } from "@nebutra/icons";
import * as React from "react";

import { type InputSize, inputTokens } from "../tokens/components/input";
import { cn } from "../utils/cn";

const Select = BaseSelect.Root;

type SelectTriggerCssVars = React.CSSProperties & {
  "--select-height"?: string;
  "--select-padding-x"?: string;
  "--select-font-size"?: string;
  "--select-radius"?: string;
  "--select-focus-ring-width"?: string;
};

function getSelectTriggerStyle(
  size: InputSize,
  style: React.CSSProperties | undefined,
): SelectTriggerCssVars {
  const token = inputTokens.sizes[size];

  return {
    "--select-height": `${token.height}px`,
    "--select-padding-x": `${token.paddingX}px`,
    "--select-font-size": `${token.fontSize}px`,
    "--select-radius": `${token.radius}px`,
    "--select-focus-ring-width": `${inputTokens.focusRingWidth}px`,
    ...style,
  };
}

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
  React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger> & { size?: InputSize }
>(({ className, children, size = "md", style, ...props }, ref) => (
  <BaseSelect.Trigger
    ref={ref}
    className={cn(
      "flex h-[var(--select-height)] w-full items-center justify-between whitespace-nowrap rounded-[var(--select-radius)] border border-input bg-background",
      "px-[var(--select-padding-x)] text-[length:var(--select-font-size)] text-foreground shadow-[var(--shadow-xs)]",
      "transition-[background-color,border-color,box-shadow,color] duration-micro ease-out placeholder:text-muted-foreground",
      "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[length:var(--select-focus-ring-width)] focus-visible:ring-ring/30",
      "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive/60 aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/20 [&>span]:line-clamp-1",
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

const SelectSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Separator>
>(({ className, ...props }, ref) => (
  <BaseSelect.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
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
