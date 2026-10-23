"use client";

import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { Plus } from "@nebutra/icons";
import type * as React from "react";
import { cn } from "../utils/cn";
import { withHtmlProps } from "../utils/primitive-props";

// =============================================================================
// Types
// =============================================================================

type AccordionSize = "default" | "small";

// Base UI types don't resolve HTML props (className, children) with React 19 +
// exactOptionalPropertyTypes. Create properly-typed aliases for JSX usage.
const AccordionItemBase = withHtmlProps<"div">(BaseAccordion.Item);
const AccordionHeaderBase = withHtmlProps<"h3">(BaseAccordion.Header);
const AccordionTriggerBase = withHtmlProps<"button">(BaseAccordion.Trigger);
const AccordionPanelBase = withHtmlProps<"div">(BaseAccordion.Panel);

// =============================================================================
// Root
// =============================================================================

/**
 * Accordion - Root of a stack of disclosure sections.
 *
 * Open items are an array of item `value`s, so it is the same shape whether one
 * or many are open. Only one item stays open unless `multiple` is set. Arrow
 * keys move focus between triggers, Home and End jump to the first and last.
 * Props come straight from Base UI's Accordion root (`value`, `defaultValue`,
 * `onValueChange`, `multiple`, `disabled`, `keepMounted`, `hiddenUntilFound`,
 * `loopFocus`, `orientation`).
 *
 * @example
 * ```tsx
 * <Accordion defaultValue={["billing"]}>
 *   <AccordionItem value="billing">
 *     <AccordionTrigger>Billing</AccordionTrigger>
 *     <AccordionContent>Invoices and payment methods.</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 * ```
 */
const Accordion = BaseAccordion.Root;

// =============================================================================
// Item
// =============================================================================

/**
 * AccordionItem - One section: a trigger paired with its panel.
 *
 * Draws the hairline between sections. A disabled item cannot be opened or
 * closed; arrow keys skip its trigger, but Tab can still reach it and it is
 * dimmed through `data-disabled`.
 */
const AccordionItem = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  /** Identifies this item in the root's `value` array, and so what opens it. */
  value: string;
  /**
   * Prevents this item from being opened or closed by the user.
   * @default false
   */
  disabled?: boolean;
} & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <AccordionItemBase
    ref={ref}
    className={cn("border-b border-border/70 last:border-b-0", className)}
    {...props}
  />
);
AccordionItem.displayName = "AccordionItem";

// =============================================================================
// Trigger
// =============================================================================

/**
 * AccordionTrigger - The heading button that opens and closes its item.
 *
 * Renders an `h3` containing a `button`, with a plus icon that turns into a
 * cross while the panel is open.
 */
const AccordionTrigger = ({
  className,
  children,
  size = "default",
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & {
  /**
   * Type size and vertical padding of the trigger. Match it on `AccordionContent`.
   * @default "default"
   */
  size?: AccordionSize;
} & { ref?: React.Ref<HTMLButtonElement> | undefined }) => (
  <AccordionHeaderBase className="flex">
    <AccordionTriggerBase
      ref={ref}
      className={cn(
        "font-medium flex flex-1 items-center justify-between transition-[color,box-shadow] duration-micro ease-out motion-reduce:transition-none hover:text-muted-foreground focus-visible:outline-none data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 [&[data-panel-open]>svg]:rotate-45",
        size === "small" ? "py-2.5 text-sm" : "py-4 text-[15px]",
        className,
      )}
      {...props}
    >
      {children}
      <Plus
        className={cn(
          "shrink-0 text-muted-foreground transition-transform duration-flow ease-out",
          size === "small" ? "size-3.5" : "size-4",
        )}
      />
    </AccordionTriggerBase>
  </AccordionHeaderBase>
);
AccordionTrigger.displayName = "AccordionTrigger";

// =============================================================================
// Content
// =============================================================================

/**
 * AccordionContent - The collapsible panel of an item.
 *
 * The height animates open and closed (instant under reduced motion).
 * `className` is applied to the padded inner wrapper, not the panel itself.
 */
const AccordionContent = ({
  className,
  children,
  size = "default",
  keepMounted,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  /**
   * Bottom padding and type size of the panel. Match it on `AccordionTrigger`.
   * @default "default"
   */
  size?: AccordionSize;
  /**
   * Keep the panel content in the DOM when closed. Lets browser find-in-page
   * and search crawlers hit hidden content. Forwarded to Base UI's Panel.
   * @default false
   */
  keepMounted?: boolean;
} & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <AccordionPanelBase
    ref={ref}
    {...(keepMounted ? { keepMounted: true } : {})}
    className="text-sm leading-relaxed h-[var(--accordion-panel-height,auto)] data-[starting-style]:h-0 data-[ending-style]:h-0 overflow-hidden text-muted-foreground transition-[height,opacity] duration-flow ease-out"
    {...props}
  >
    <div className={cn(size === "small" ? "pb-2.5 pt-0" : "pb-4 pt-0", className)}>{children}</div>
  </AccordionPanelBase>
);
AccordionContent.displayName = "AccordionContent";

// =============================================================================
// Exports
// =============================================================================

export { Accordion, AccordionContent, AccordionItem, type AccordionSize, AccordionTrigger };
