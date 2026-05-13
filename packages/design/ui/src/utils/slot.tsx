"use client";

import * as React from "react";
import { cn } from "./cn";

export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

/**
 * Custom Slot implementation to remove @radix-ui/react-slot dependency.
 * Merges props from the Slottable parent onto the immediate child element.
 */
export const Slot = React.forwardRef<HTMLElement, SlotProps>(
  ({ children, className, style, ...props }, ref) => {
    // Resolve the single child without using React.Children.only — which throws
    // when children is a single-element array, fragment, or a string. Prerender
    // pipelines sometimes wrap JSX children in arrays of length 1, which passes
    // React.Children.count(=== 1) but trips React.Children.only.
    const childArray = React.Children.toArray(children);
    const child = childArray.length === 1 ? childArray[0] : null;

    if (child == null || !React.isValidElement(child)) {
      // 0 / 2+ / non-element child — graceful span wrapper instead of throwing.
      return (
        <span ref={ref} className={className} style={style} {...props}>
          {children}
        </span>
      );
    }

    const childProps = child.props as React.HTMLAttributes<HTMLElement>;
    return React.cloneElement(child, {
      ...props,
      ...childProps,
      ref: (node: HTMLElement | null) => {
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;

        const childRef = (child as React.ReactElement & { ref?: React.Ref<HTMLElement> }).ref;
        if (typeof childRef === "function") childRef(node);
        else if (childRef && "current" in childRef) {
          (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }
      },
      className: cn(className, childProps.className),
      style: { ...style, ...childProps.style },
    } as React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement>);
  },
);

Slot.displayName = "Slot";

/**
 * Slottable acts as a marker. In this simple implementation,
 * we just resolve it as a fragment wrapper. For deeper `asChild` composition,
 * complex logic is usually required, but most primitives just need `Slot`.
 */
export const Slottable: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
