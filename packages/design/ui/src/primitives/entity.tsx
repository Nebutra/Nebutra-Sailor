"use client";

import type * as React from "react";
import { cn } from "../utils/cn";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = (as ?? "div") as any;

  return (
    <Comp
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        "[&:not(:last-child)]:border-b",
        className,
      )}
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
