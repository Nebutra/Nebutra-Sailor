"use client";

import { ChevronLeft, ChevronRight } from "@nebutra/icons";
import type * as React from "react";
import { paginationTokens } from "../tokens/components/pagination";
import { cn } from "../utils/cn";

type PaginationCssVar =
  | "--pagination-gap"
  | "--pagination-min-height"
  | "--pagination-padding-x"
  | "--pagination-padding-y"
  | "--pagination-radius"
  | "--pagination-icon-size"
  | "--pagination-label-size"
  | "--pagination-title-size"
  | "--pagination-title-gap"
  | "--pagination-duration"
  | "--pagination-easing";

type PaginationCssVars = React.CSSProperties & Record<PaginationCssVar, string>;

export interface PaginationDestination {
  /** Name of the target page, shown as the rail's main line and used in its accessible name. */
  title: string;
  /** URL of the target page, rendered as a plain `a` `href`. */
  href: string;
}

export interface PaginationProps extends Omit<React.ComponentPropsWithoutRef<"nav">, "children"> {
  /** The page before this one. Leave it out on the first page: the slot stays empty. */
  previous?: PaginationDestination;
  /** The page after this one. Leave it out on the last page: the slot stays empty. */
  next?: PaginationDestination;
  /**
   * Small caption above the previous page's title.
   * @default "Previous"
   */
  previousLabel?: string;
  /**
   * Small caption above the next page's title.
   * @default "Next"
   */
  nextLabel?: string;
  /**
   * Accessible name of each link. It replaces the English default, so pass it to localise the
   * rail; the visible caption (`previousLabel` / `nextLabel`) is separate.
   * @default (direction, title) => `Go to ${direction} page: ${title}`
   */
  linkLabel?: (direction: "previous" | "next", title: string) => string;
}

function defaultLinkLabel(direction: "previous" | "next", title: string): string {
  return `Go to ${direction} page: ${title}`;
}

function paginationCssVars(style: React.CSSProperties | undefined): PaginationCssVars {
  return {
    "--pagination-gap": `${paginationTokens.gap}px`,
    "--pagination-min-height": `${paginationTokens.minHeight}px`,
    "--pagination-padding-x": `${paginationTokens.padding.x}px`,
    "--pagination-padding-y": `${paginationTokens.padding.y}px`,
    "--pagination-radius": `${paginationTokens.radius}px`,
    "--pagination-icon-size": `${paginationTokens.iconSize}px`,
    "--pagination-label-size": `${paginationTokens.labelSize}px`,
    "--pagination-title-size": `${paginationTokens.titleSize}px`,
    "--pagination-title-gap": `${paginationTokens.titleGap}px`,
    "--pagination-duration": `${paginationTokens.motion.duration}ms`,
    "--pagination-easing": paginationTokens.motion.easing,
    ...style,
  };
}

function PaginationRail({
  destination,
  direction,
  label,
  linkLabel,
}: {
  destination: PaginationDestination | undefined;
  direction: "previous" | "next";
  label: string;
  linkLabel: (direction: "previous" | "next", title: string) => string;
}) {
  if (!destination) {
    return <div aria-hidden="true" className="hidden sm:block" />;
  }

  const isPrevious = direction === "previous";
  const Icon = isPrevious ? ChevronLeft : ChevronRight;

  return (
    <a
      href={destination.href}
      rel={direction === "previous" ? "prev" : "next"}
      aria-label={linkLabel(direction, destination.title)}
      className={cn(
        "group flex min-h-[var(--pagination-min-height)] min-w-0 items-center gap-[var(--pagination-gap)] rounded-[var(--pagination-radius)] border border-border bg-background",
        "px-[var(--pagination-padding-x)] py-[var(--pagination-padding-y)] text-foreground shadow-xs",
        "transition-[background-color,border-color,box-shadow,color,transform] duration-[var(--pagination-duration)] ease-[var(--pagination-easing)]",
        "hover:border-ring hover:bg-accent focus-visible:outline-none",
        "motion-reduce:transition-none",
        isPrevious ? "justify-start text-start" : "justify-end text-end",
      )}
    >
      {isPrevious && (
        <Icon
          aria-hidden="true"
          className="size-[var(--pagination-icon-size)] shrink-0 text-muted-foreground transition-transform duration-[var(--pagination-duration)] group-hover:-translate-x-0.5 motion-reduce:transition-none rtl:rotate-180 rtl:group-hover:translate-x-0.5"
        />
      )}
      <span className="flex min-w-0 flex-col gap-[var(--pagination-title-gap)]">
        <span className="text-[length:var(--pagination-label-size)] font-medium uppercase tracking-normal text-muted-foreground">
          {label}
        </span>
        <span className="truncate text-[length:var(--pagination-title-size)] font-medium text-foreground">
          {destination.title}
        </span>
      </span>
      {!isPrevious && (
        <Icon
          aria-hidden="true"
          className="size-[var(--pagination-icon-size)] shrink-0 text-muted-foreground transition-transform duration-[var(--pagination-duration)] group-hover:translate-x-0.5 motion-reduce:transition-none rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
        />
      )}
    </a>
  );
}

/**
 * Pagination - Previous and next links between neighbouring pages.
 *
 * A two-slot navigation rail for ordered content such as docs or posts, not a
 * numbered page list: there are no page numbers, current-page marker or
 * ellipsis. Each side is a titled link with a caption. The two sit side by side
 * from `sm` up and stack below it. The rail labels itself "Page navigation"
 * (override with `aria-label`). With neither `previous` nor `next` it renders nothing instead of
 * an empty landmark. In right-to-left pages the slots swap sides and the arrows mirror.
 *
 * @example
 * ```tsx
 * <Pagination
 *   previous={{ title: "Installation", href: "/docs/installation" }}
 *   next={{ title: "Theming", href: "/docs/theming" }}
 * />
 * ```
 */
export function Pagination({
  previous,
  next,
  previousLabel = "Previous",
  nextLabel = "Next",
  linkLabel = defaultLinkLabel,
  className,
  style,
  "aria-label": ariaLabel = "Page navigation",
  ...props
}: PaginationProps) {
  if (!previous && !next) return null;
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "grid w-full grid-cols-1 gap-[var(--pagination-gap)] sm:grid-cols-2",
        className,
      )}
      style={paginationCssVars(style)}
      {...props}
    >
      <PaginationRail
        destination={previous}
        direction="previous"
        label={previousLabel}
        linkLabel={linkLabel}
      />
      <PaginationRail destination={next} direction="next" label={nextLabel} linkLabel={linkLabel} />
    </nav>
  );
}

Pagination.displayName = "Pagination";
