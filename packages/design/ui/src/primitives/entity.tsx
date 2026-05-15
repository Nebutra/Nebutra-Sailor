"use client";

import type * as React from "react";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- *\
 *  Entity — row of descriptive content paired with one or two controls.
 *
 *  Use cases (per Geist guidance):
 *    Member rows, integration rows, domain rows, device rows. For tabular
 *    data with sortable columns and shared row shape use Table; for a static
 *    key/value metadata block on a detail page use Description.
 *
 *  Border bookkeeping:
 *    The previous implementation also added `border-b` on the Entity itself
 *    which double-banded rows inside an Entity.List (`divide-y`). The List
 *    now owns the separator; standalone Entities get no internal separator,
 *    which is correct — a single row has nothing to separate from.
 *
 *  When `as="button"`:
 *    `type="button"` is injected automatically so the row doesn't submit
 *    enclosing forms, and hover + focus-visible styles make the clickability
 *    discoverable to keyboard users.
 *
 *  Known gotcha (caller responsibility):
 *    When a clickable row (`as="button"`) wraps an interactive child like
 *    Checkbox, child clicks bubble to the row handler → double-toggle. Geist
 *    has the same shape in its own demos. Stop propagation in the child's
 *    onClick if you want strict single-fire semantics.
\* -------------------------------------------------------------------------- */

// =============================================================================
// Types
// =============================================================================

export interface EntityProps<T extends React.ElementType = "div"> {
  /** Override the root element (e.g. "li" when inside Entity.List) */
  as?: T;
  /** Content to render in the left slot (avatar, icon, etc.) */
  left?: React.ReactNode;
  /** Content to render in the right slot (actions, metadata, etc.) */
  right?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export interface EntityContentProps {
  /** Primary label */
  title: string;
  /** Supporting text shown below the title */
  description?: React.ReactNode;
  /** When true, the content block expands to fill available space */
  fill?: boolean;
  className?: string;
}

export interface EntityListProps {
  children?: React.ReactNode;
  className?: string;
}

// =============================================================================
// Entity (root row)
// =============================================================================

function EntityRoot<T extends React.ElementType = "div">({
  as,
  left,
  right,
  children,
  className,
  ...props
}: EntityProps<T> & Omit<React.ComponentPropsWithoutRef<T>, keyof EntityProps<T>>) {
  // biome-ignore lint/suspicious/noExplicitAny: polymorphic-as with arbitrary HTML props is famously hard to type in React; the cast is contained to the render call.
  const Comp = (as ?? "div") as any;
  const isButton = as === "button";

  // Auto-inject `type="button"` for button rows so they don't submit any
  // enclosing form. Caller can still override via spread.
  const buttonDefaults = isButton ? { type: "button" as const } : {};

  return (
    <Comp
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left",
        // Clickable rows get hover + focus-visible affordance.
        isButton &&
          "cursor-pointer transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        className,
      )}
      {...buttonDefaults}
      {...props}
    >
      {left && <div className="flex shrink-0 items-center">{left}</div>}

      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>

      {right && <div className="flex shrink-0 items-center">{right}</div>}
    </Comp>
  );
}
EntityRoot.displayName = "Entity";

// =============================================================================
// Entity.Content
// =============================================================================

function EntityContent({ title, description, fill = false, className }: EntityContentProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", fill && "flex-1", className)}>
      <span className="truncate text-sm font-medium text-foreground">{title}</span>
      {description && <span className="truncate text-sm text-muted-foreground">{description}</span>}
    </div>
  );
}
EntityContent.displayName = "Entity.Content";

// =============================================================================
// Entity.List
// =============================================================================

function EntityList({ children, className }: EntityListProps) {
  return (
    <ul className={cn("divide-y rounded-[var(--radius-lg)] border bg-background", className)}>
      {children}
    </ul>
  );
}
EntityList.displayName = "Entity.List";

// =============================================================================
// Compound export
// =============================================================================

export const Entity = Object.assign(EntityRoot, {
  Content: EntityContent,
  List: EntityList,
}) as typeof EntityRoot & {
  Content: typeof EntityContent;
  List: typeof EntityList;
};
