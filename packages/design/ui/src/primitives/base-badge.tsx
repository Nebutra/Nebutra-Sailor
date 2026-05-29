import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";
import { baseBadgeVariants } from "./base-badge-variants";

export interface BaseBadgeProps
  extends useRender.ComponentProps<"span">,
    VariantProps<typeof baseBadgeVariants> {
  asChild?: boolean;
  dotClassName?: string;
  disabled?: boolean;
}

function BaseBadge({
  render,
  asChild = false,
  children,
  className,
  variant,
  size,
  appearance,
  shape,
  disabled,
  ...props
}: BaseBadgeProps) {
  const defaultProps = {
    className: cn(baseBadgeVariants({ variant, size, appearance, shape, disabled }), className),
    "data-slot": "badge",
  };

  const renderElement =
    asChild && React.isValidElement(children)
      ? (children as React.ReactElement<
          Record<string, unknown>,
          string | React.JSXElementConstructor<unknown>
        >)
      : render || <span />;

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

export { BaseBadgeButton, type BaseBadgeButtonProps } from "./base-badge-button";
export { BaseBadgeDot, type BaseBadgeDotProps } from "./base-badge-dot";
export { BaseBadge };
