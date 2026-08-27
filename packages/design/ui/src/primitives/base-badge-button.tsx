import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";
import { baseBadgeButtonVariants } from "./base-badge-variants";
import { getControlLabelProps } from "./control-label";

export interface BaseBadgeButtonProps
  extends useRender.ComponentProps<"button">,
    VariantProps<typeof baseBadgeButtonVariants> {
  asChild?: boolean;
}

function BaseBadgeButton({
  render,
  asChild = false,
  children,
  className,
  variant,
  ...props
}: BaseBadgeButtonProps) {
  const controlLabelProps = getControlLabelProps({
    children,
    fallbackLabel: "Badge action",
    label: props["aria-label"],
    labelledBy: props["aria-labelledby"],
    title: props.title,
  });

  const defaultProps = {
    ...controlLabelProps,
    className: cn(baseBadgeButtonVariants({ variant, className })),
    role: "button" as const,
    "data-slot": "badge-button",
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

export { BaseBadgeButton };
