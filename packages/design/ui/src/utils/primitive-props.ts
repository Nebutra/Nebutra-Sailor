import type * as React from "react";

export type PrimitiveProps<T> = React.PropsWithChildren<T & { className?: string | undefined }>;

export type PrimitiveComponent<TElement, TProps> = React.ForwardRefExoticComponent<
  PrimitiveProps<TProps> & React.RefAttributes<TElement>
>;

/**
 * Resolve the HTMLElement type for a given intrinsic element tag.
 */
type ElementForTag<E extends keyof React.JSX.IntrinsicElements> = E extends "button"
  ? HTMLButtonElement
  : E extends "span"
    ? HTMLSpanElement
    : E extends "img"
      ? HTMLImageElement
      : E extends "label"
        ? HTMLLabelElement
        : E extends "input"
          ? HTMLInputElement
          : E extends "a"
            ? HTMLAnchorElement
            : E extends "p"
              ? HTMLParagraphElement
              : E extends "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
                ? HTMLHeadingElement
                : HTMLElement;

/**
 * Workaround for Radix UI types not resolving HTML element props (className,
 * children, etc.) with React 19 + exactOptionalPropertyTypes.
 *
 * The optional second type parameter `Extra` allows preserving Radix-specific
 * props (e.g. `asChild`, `align`, `sideOffset`) that are not standard HTML attrs.
 *
 * Usage:
 *   const Header = withHtmlProps<"h3">(AccordionPrimitive.Header);
 *   const Trigger = withHtmlProps<"button", { asChild?: boolean }>(DialogPrimitive.Trigger);
 *   const Content = withHtmlProps<"div", { align?: string; sideOffset?: number }>(PopoverPrimitive.Content);
 */

export function withHtmlProps<E extends keyof React.JSX.IntrinsicElements, Extra = object>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: any,
): React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<E> & Extra & React.RefAttributes<ElementForTag<E>>
> {
  return Component;
}
