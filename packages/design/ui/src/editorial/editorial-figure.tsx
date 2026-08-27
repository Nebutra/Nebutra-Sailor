import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { EDITORIAL_CAPTION, EDITORIAL_EYEBROW, editorialBlock } from "./editorial-surface";

export type EditorialFigureProps = {
  caption?: ReactNode;
  className?: string;
  /**
   * Image slot. Apps pass their own image component — keeping `next/image` out
   * of this package is what lets it render in Storybook and non-Next surfaces.
   */
  media: ReactNode;
  width?: "column" | "breakout" | "full";
};

/** Single image with an optional caption. */
export function EditorialFigure({
  caption,
  className,
  media,
  width = "column",
}: EditorialFigureProps) {
  return (
    <figure className={cn(editorialBlock({ spacing: "normal", width }), className)}>
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border bg-muted shadow-ambient-sm">
        {media}
      </div>
      {caption && (
        <figcaption className={cn("mt-3 text-center", EDITORIAL_CAPTION)}>{caption}</figcaption>
      )}
    </figure>
  );
}

export type EditorialFigureGroupProps = {
  className?: string;
  /** Rendered figures. Two or three read best; more should become a gallery. */
  children: ReactNode;
  label?: string;
  title?: string | null;
  variant?: "grid" | "comparison" | "sequence";
};

const GROUP_LAYOUT: Record<NonNullable<EditorialFigureGroupProps["variant"]>, string> = {
  comparison: "grid gap-4 sm:grid-cols-2",
  grid: "grid gap-4 sm:grid-cols-2",
  sequence: "grid gap-4",
};

/** Set of related figures shown together. */
export function EditorialFigureGroup({
  children,
  className,
  label,
  title,
  variant = "grid",
}: EditorialFigureGroupProps) {
  return (
    <section
      aria-label={title ?? label ?? undefined}
      className={cn(editorialBlock({ spacing: "loose", width: "breakout" }), className)}
    >
      {(label || title) && (
        <div className="mb-4">
          {label && <div className={EDITORIAL_EYEBROW}>{label}</div>}
          {title && (
            <h3 className="mt-2 text-lg font-semibold leading-6 text-foreground">{title}</h3>
          )}
        </div>
      )}
      <div className={GROUP_LAYOUT[variant]}>{children}</div>
    </section>
  );
}
