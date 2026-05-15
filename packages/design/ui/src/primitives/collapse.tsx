"use client";

import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  type ReactNode,
  useId,
  useMemo,
} from "react";
import { cn } from "../utils/cn";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  type AccordionSize,
  AccordionTrigger,
} from "./accordion";

/* -------------------------------------------------------------------------- *\
 *  Collapse / CollapseGroup — Geist-style flat API on top of our Accordion.
 *
 *  Surface choice:
 *    Use `Collapse` for optional, advanced, or repetitive content most users
 *    skip on most visits (FAQ, advanced settings, request payload preview).
 *    For top-level structure every user reads, use page sections with regular
 *    headings — collapsing primary content hides what the page is about.
 *
 *  Standalone vs grouped:
 *    A bare `<Collapse>` wraps itself in a single-item Accordion. Wrapping in
 *    `<CollapseGroup>` lets siblings coordinate single-open semantics; pass
 *    `multiple` when items are independent.
 *
 *  Why this lives next to Accordion, not as a fork:
 *    The Accordion primitive already encodes Base UI's a11y wiring, our
 *    focus-visible tokens, the size variants matching Geist's "default" /
 *    "small", and the open-state animations. Collapse is a thin facade that
 *    rewrites Geist's `title` + `defaultExpanded` props into Accordion's
 *    `value` + `defaultValue` model. Do not duplicate behavior.
 *
 *  Content persistence:
 *    `keepMounted` (default true) keeps the panel in the DOM when closed so
 *    browser find-in-page and search crawlers can hit the content. Opt out
 *    when the panel renders expensive widgets.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CollapseSize = AccordionSize;

export type CollapseProps = {
  /** Panel heading. Title Case, names the topic (not the action). */
  title: ReactNode;
  /** Initial expanded state (uncontrolled). */
  defaultExpanded?: boolean;
  /** Visual variant. `small` for tight density (in-cards). */
  size?: CollapseSize;
  /**
   * Keep the panel content in the DOM when closed so browser find-in-page
   * and search crawlers still hit it. @default true
   */
  keepMounted?: boolean;
  /** Disable the trigger. */
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  /** Internal — auto-set by CollapseGroup. Do not pass directly. */
  __value?: string;
};

export type CollapseGroupProps = {
  /** Allow multiple panels open simultaneously. @default false */
  multiple?: boolean;
  /**
   * Visual variant applied to every child Collapse that doesn't set its own.
   */
  size?: CollapseSize;
  children: ReactNode;
  className?: string;
};

// ---------------------------------------------------------------------------
// CollapseGroup
// ---------------------------------------------------------------------------

export const CollapseGroup = forwardRef<HTMLDivElement, CollapseGroupProps>(function CollapseGroup(
  { multiple = false, size, children, className },
  ref,
) {
  // Walk children, stamp each Collapse with an auto-generated value, and
  // aggregate `defaultExpanded` flags into the Accordion's `defaultValue`.
  const groupId = useId();
  const { stampedChildren, defaultValue } = useMemo(() => {
    const stamped: ReactNode[] = [];
    const expanded: string[] = [];
    let index = 0;

    Children.forEach(children, (child) => {
      if (!isValidElement<CollapseProps>(child) || child.type !== Collapse) {
        stamped.push(child);
        return;
      }
      const value = `${groupId}-${index++}`;
      if (child.props.defaultExpanded) expanded.push(value);
      stamped.push(
        cloneElement(child, {
          __value: value,
          size: child.props.size ?? size,
        } as Partial<CollapseProps>),
      );
    });

    return { stampedChildren: stamped, defaultValue: expanded };
  }, [children, groupId, size]);

  // Base UI Accordion's "single" mode expects a string default; "multiple"
  // expects a string[]. Map accordingly.
  const accordionDefault: string | string[] = multiple ? defaultValue : (defaultValue[0] ?? "");

  return (
    <Accordion
      ref={ref}
      // biome-ignore lint/suspicious/noExplicitAny: Base UI's Accordion.Root types narrow defaultValue by `multiple` but TS can't follow the discriminator across our wrapper.
      multiple={multiple as any}
      defaultValue={accordionDefault as any}
      className={cn("w-full", className)}
    >
      {stampedChildren}
    </Accordion>
  );
});

// ---------------------------------------------------------------------------
// Collapse
// ---------------------------------------------------------------------------

export const Collapse = forwardRef<HTMLDivElement, CollapseProps>(function Collapse(
  {
    title,
    defaultExpanded = false,
    size = "default",
    keepMounted = true,
    disabled,
    children,
    className,
    __value,
  },
  ref,
) {
  // Standalone mode: render our own single-item Accordion. CollapseGroup mode:
  // we receive __value and the parent owns the Accordion.
  const standaloneId = useId();
  const isStandalone = __value === undefined;
  const value = __value ?? standaloneId;

  const item = (
    <AccordionItem
      ref={ref}
      value={value}
      // exactOptionalPropertyTypes: only pass `disabled` when truthy so the
      // optional `boolean` prop never sees an explicit `undefined`.
      {...(disabled ? { disabled: true } : {})}
      className={cn(isStandalone && "border-0", className)}
    >
      <AccordionTrigger size={size}>{title}</AccordionTrigger>
      <AccordionContent size={size} keepMounted={keepMounted}>
        {children}
      </AccordionContent>
    </AccordionItem>
  );

  if (!isStandalone) return item;

  return (
    <Accordion
      // biome-ignore lint/suspicious/noExplicitAny: Base UI's Accordion.Root types narrow defaultValue by `multiple` but TS can't follow the discriminator across our wrapper.
      multiple={false as any}
      // biome-ignore lint/suspicious/noExplicitAny: see above
      defaultValue={(defaultExpanded ? value : "") as any}
      className="w-full"
    >
      {item}
    </Accordion>
  );
});
