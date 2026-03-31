"use client";

import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { Plus } from "lucide-react";
import * as React from "react";
import { cn } from "../utils/cn";
import { withHtmlProps } from "../utils/primitive-props";

// =============================================================================
// Types
// =============================================================================

type AccordionSize = "default" | "small";

// Radix types don't resolve HTML props (className, children) with React 19 +
// exactOptionalPropertyTypes. Create properly-typed aliases for JSX usage.
const RadixItem = withHtmlProps<"div">(BaseAccordion.Item);
const RadixHeader = withHtmlProps<"h3">(BaseAccordion.Header);
const RadixTrigger = withHtmlProps<"button">(BaseAccordion.Trigger);
const RadixContent = withHtmlProps<"div">(BaseAccordion.Panel);

// =============================================================================
// Root
// =============================================================================

const Accordion = BaseAccordion.Root;

// =============================================================================
// Item
// =============================================================================

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & { value: string; disabled?: boolean }
>(({ className, ...props }, ref) => (
  <RadixItem
    ref={ref}
    className={cn("border-b border-border/70 last:border-b-0", className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

// =============================================================================
// Trigger
// =============================================================================

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & {
    /** Size variant matching Geist Collapse */
    size?: AccordionSize;
  }
>(({ className, children, size = "default", ...props }, ref) => (
  <RadixHeader className="flex">
    <RadixTrigger
      ref={ref}
      className={cn(
        "font-medium flex flex-1 items-center justify-between transition-all duration-200 hover:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none [&[data-panel-open]>svg]:rotate-45",
        size === "small" ? "py-2.5 text-sm" : "py-4 text-[15px]",
        className,
      )}
      {...props}
    >
      {children}
      <Plus
        className={cn(
          "shrink-0 text-muted-foreground transition-transform duration-200",
          size === "small" ? "h-3.5 w-3.5" : "h-4 w-4",
        )}
      />
    </RadixTrigger>
  </RadixHeader>
));
AccordionTrigger.displayName = "AccordionTrigger";

// =============================================================================
// Content
// =============================================================================

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    /** Size variant matching Geist Collapse */
    size?: AccordionSize;
  }
>(({ className, children, size = "default", ...props }, ref) => (
  <RadixContent
    ref={ref}
    className="text-sm leading-relaxed data-[ending-style]:animate-accordion-up data-[open]:animate-accordion-down overflow-hidden text-muted-foreground transition-all"
    {...props}
  >
    <div className={cn(size === "small" ? "pb-2.5 pt-0" : "pb-4 pt-0", className)}>{children}</div>
  </RadixContent>
));
AccordionContent.displayName = "AccordionContent";

// =============================================================================
// Exports
// =============================================================================

export { Accordion, AccordionContent, AccordionItem, type AccordionSize, AccordionTrigger };
