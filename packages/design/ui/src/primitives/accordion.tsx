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

const Accordion = BaseAccordion.Root;

// =============================================================================
// Item
// =============================================================================

const AccordionItem = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { value: string; disabled?: boolean } & {
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

const AccordionTrigger = ({
  className,
  children,
  size = "default",
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & {
  /** Size variant matching Geist Collapse */
  size?: AccordionSize;
} & { ref?: React.Ref<HTMLButtonElement> | undefined }) => (
  <AccordionHeaderBase className="flex">
    <AccordionTriggerBase
      ref={ref}
      className={cn(
        "font-medium flex flex-1 items-center justify-between transition-[color,box-shadow] duration-flow ease-out hover:text-muted-foreground focus-visible:outline-none [&[data-panel-open]>svg]:rotate-45",
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

const AccordionContent = ({
  className,
  children,
  size = "default",
  keepMounted,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  /** Size variant matching Geist Collapse */
  size?: AccordionSize;
  /**
   * Keep the panel content in the DOM when closed. Lets browser find-in-page
   * and search crawlers hit hidden content. Forwarded to Base UI's Panel.
   * @default false (Base UI's default)
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
