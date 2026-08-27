"use client";

import { ChevronDown } from "@nebutra/icons";
import type * as React from "react";
import { splitButtonTokens } from "../tokens/components/split-button";
import { cn } from "../utils/cn";
import { Button, type ButtonProps } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  type DropdownMenuContentProps,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export type SplitButtonType = "default" | "secondary";
export type SplitButtonMenuAlignment = "bottom-start" | "bottom-end";

type ButtonSizeProp = Extract<ButtonProps["size"], string>;
type SplitButtonNativeSize = Exclude<ButtonSizeProp, "icon">;

export type SplitButtonSize = SplitButtonNativeSize | "small" | "medium" | "large";

export interface SplitButtonPrimaryProps
  extends Omit<
    ButtonProps,
    | "children"
    | "className"
    | "loading"
    | "prefix"
    | "shape"
    | "size"
    | "suffix"
    | "type"
    | "variant"
  > {
  /** Geist-compatible visual type. Intentionally limited to non-destructive variants. */
  type?: SplitButtonType;
  /** Native button type. Defaults to `button` to avoid accidental form submit. */
  htmlType?: ButtonProps["type"];
  size?: SplitButtonSize;
  className?: string;
  loading?: boolean;
  prefix?: React.ReactNode;
}

export interface SplitButtonMenuContentProps
  extends Omit<DropdownMenuContentProps, "align" | "side"> {
  width?: number | string;
}

export interface SplitButtonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  children: React.ReactNode;
  buttonProps?: SplitButtonPrimaryProps;
  disabled?: boolean;
  menuAlignment?: SplitButtonMenuAlignment;
  menuButtonLabel: string;
  menuItems: React.ReactNode;
  menuProps?: SplitButtonMenuContentProps;
}

export interface SplitButtonMenuItemProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  menuItemProps?: Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuItem>, "children">;
}

type SplitButtonCssVars = React.CSSProperties & {
  "--split-button-trigger-width": string;
  "--split-button-menu-min-width": string;
  "--split-button-item-gap": string;
  "--split-button-item-padding-x": string;
  "--split-button-item-padding-y": string;
  "--split-button-item-description-gap": string;
  "--split-button-item-radius": string;
  "--split-button-item-icon-size": string;
  "--split-button-duration": string;
  "--split-button-easing": string;
};

const SPLIT_SIZE_TO_BUTTON_SIZE = {
  tiny: "tiny",
  sm: "sm",
  small: "sm",
  default: "default",
  medium: "default",
  lg: "lg",
  large: "lg",
} as const satisfies Record<SplitButtonSize, SplitButtonNativeSize>;

const SPLIT_SIZE_TO_TOKEN_SIZE = {
  tiny: "tiny",
  sm: "sm",
  small: "sm",
  default: "md",
  medium: "md",
  lg: "lg",
  large: "lg",
} as const satisfies Record<SplitButtonSize, keyof typeof splitButtonTokens.triggerWidth>;

const menuAlignment = {
  "bottom-start": {
    align: "start",
    side: "bottom",
  },
  "bottom-end": {
    align: "end",
    side: "bottom",
  },
} as const satisfies Record<
  SplitButtonMenuAlignment,
  {
    align: NonNullable<DropdownMenuContentProps["align"]>;
    side: NonNullable<DropdownMenuContentProps["side"]>;
  }
>;

function createSplitButtonVars(size: SplitButtonSize): SplitButtonCssVars {
  const tokenSize = SPLIT_SIZE_TO_TOKEN_SIZE[size];

  return {
    "--split-button-trigger-width": `${splitButtonTokens.triggerWidth[tokenSize]}px`,
    "--split-button-menu-min-width": `${splitButtonTokens.menu.minWidth}px`,
    "--split-button-item-gap": `${splitButtonTokens.item.gap}px`,
    "--split-button-item-padding-x": `${splitButtonTokens.item.paddingX}px`,
    "--split-button-item-padding-y": `${splitButtonTokens.item.paddingY}px`,
    "--split-button-item-description-gap": `${splitButtonTokens.item.descriptionGap}px`,
    "--split-button-item-radius": `${splitButtonTokens.item.radius}px`,
    "--split-button-item-icon-size": `${splitButtonTokens.item.iconSize}px`,
    "--split-button-duration": `${splitButtonTokens.motion.duration}ms`,
    "--split-button-easing": splitButtonTokens.motion.easing,
  };
}

function SplitButtonRoot({
  children,
  className,
  disabled,
  menuAlignment: alignment = "bottom-start",
  menuButtonLabel,
  menuItems,
  menuProps,
  buttonProps,
  style,
  ...props
}: SplitButtonProps) {
  const {
    className: buttonClassName,
    disabled: buttonDisabled,
    htmlType,
    loading,
    prefix,
    size = "medium",
    type = "default",
    ...primaryButtonProps
  } = buttonProps ?? {};
  const { className: menuClassName, style: menuStyle, width, ...contentProps } = menuProps ?? {};

  const buttonSize = SPLIT_SIZE_TO_BUTTON_SIZE[size];
  const isDisabled = disabled || Boolean(buttonDisabled) || Boolean(loading);
  const splitVars = createSplitButtonVars(size);
  const placement = menuAlignment[alignment];
  const menuWidth = width ?? splitButtonTokens.menu.width;

  return (
    <DropdownMenu>
      <div
        className={cn("inline-flex items-stretch", className)}
        style={{ ...splitVars, ...style }}
        {...props}
      >
        <Button
          className={cn(
            "rounded-r-none focus-visible:relative focus-visible:z-10",
            buttonClassName,
          )}
          disabled={isDisabled}
          loading={Boolean(loading)}
          prefix={prefix}
          size={buttonSize}
          type={htmlType ?? "button"}
          variant={type}
          {...primaryButtonProps}
        >
          {children}
        </Button>

        <DropdownMenuTrigger asChild>
          <Button
            aria-label={menuButtonLabel}
            className={cn(
              "w-[var(--split-button-trigger-width)] rounded-l-none px-0 focus-visible:relative focus-visible:z-10",
              "transition-[background-color,border-color,color] duration-[var(--split-button-duration)] ease-[var(--split-button-easing)]",
              type === "default"
                ? "border-l border-primary-foreground/20"
                : "border-l border-border/80",
            )}
            disabled={isDisabled}
            size={buttonSize}
            type="button"
            variant={type}
          >
            <ChevronDown aria-hidden="true" className="size-3.5 opacity-80" />
          </Button>
        </DropdownMenuTrigger>
      </div>

      <DropdownMenuContent
        align={placement.align}
        className={cn("min-w-[var(--split-button-menu-min-width)] p-1", menuClassName)}
        side={placement.side}
        sideOffset={6}
        style={{ width: menuWidth, ...menuStyle }}
        {...contentProps}
      >
        {menuItems}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SplitButtonMenuItem({
  title,
  description,
  icon,
  menuItemProps,
}: SplitButtonMenuItemProps) {
  const { className, ...itemProps } = menuItemProps ?? {};

  return (
    <DropdownMenuItem
      className={cn(
        "items-start gap-[var(--split-button-item-gap)] rounded-[var(--split-button-item-radius)] px-[var(--split-button-item-padding-x)] py-[var(--split-button-item-padding-y)]",
        className,
      )}
      {...itemProps}
    >
      {icon != null && (
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-[var(--split-button-item-icon-size)] shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-full"
        >
          {icon}
        </span>
      )}
      <span className="grid min-w-0 gap-[var(--split-button-item-description-gap)]">
        <span className="truncate font-medium text-foreground">{title}</span>
        {description != null && (
          <span className="line-clamp-2 text-muted-foreground text-xs leading-5">
            {description}
          </span>
        )}
      </span>
    </DropdownMenuItem>
  );
}

const SplitButton = Object.assign(SplitButtonRoot, {
  MenuItem: SplitButtonMenuItem,
});

export { SplitButton, SplitButtonMenuItem };
