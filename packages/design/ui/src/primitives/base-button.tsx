import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ChevronDown, type IconProps, type Icon as LucideIcon } from "@nebutra/icons";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";
import { baseButtonVariants } from "./base-button-variants";
import { getControlLabelProps } from "./control-label";

export interface BaseButtonProps
  extends useRender.ComponentProps<"button">,
    VariantProps<typeof baseButtonVariants> {
  selected?: boolean;
  asChild?: boolean;
}

function BaseButton({
  render,
  asChild = false,
  children,
  className,
  selected,
  variant,
  shape,
  appearance,
  mode,
  size,
  autoHeight,
  underlined,
  underline,
  placeholder = false,
  ...props
}: BaseButtonProps) {
  const controlLabelProps = getControlLabelProps({
    children,
    fallbackLabel: "Button",
    label: props["aria-label"],
    labelledBy: props["aria-labelledby"],
    title: props.title,
  });

  const defaultProps = {
    ...controlLabelProps,
    "data-slot": "button",
    className: cn(
      baseButtonVariants({
        variant,
        size,
        shape,
        appearance,
        mode,
        autoHeight,
        placeholder,
        underlined,
        underline,
        className,
      }),
      asChild && props.disabled && "pointer-events-none opacity-50",
    ),
    ...(selected && { "data-state": "open" as const }),
  };

  const renderElement =
    asChild && React.isValidElement(children)
      ? (children as React.ReactElement<
          Record<string, unknown>,
          string | React.JSXElementConstructor<unknown>
        >)
      : render || <button type="button" aria-label={controlLabelProps["aria-label"]} />;

  const finalProps =
    asChild && React.isValidElement(children)
      ? mergeProps(defaultProps, props)
      : mergeProps(defaultProps, { ...props, children });

  const element = useRender({
    render: renderElement,
    props: finalProps,
  });

  return element;
}

interface BaseButtonArrowProps extends IconProps {
  icon?: LucideIcon;
}

function BaseButtonArrow({ icon: Icon = ChevronDown, className, ...props }: BaseButtonArrowProps) {
  return <Icon data-slot="button-arrow" className={cn("ms-auto -me-1", className)} {...props} />;
}

export { BaseButton, BaseButtonArrow };
