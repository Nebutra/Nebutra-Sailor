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
  title: string;
  href: string;
}

export interface PaginationProps extends Omit<React.ComponentPropsWithoutRef<"nav">, "children"> {
  previous?: PaginationDestination;
  next?: PaginationDestination;
  previousLabel?: string;
  nextLabel?: string;
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
}: {
  destination?: PaginationDestination;
  direction: "previous" | "next";
  label: string;
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
      aria-label={`Go to ${direction} page: ${destination.title}`}
      className={cn(
        "group flex min-h-[var(--pagination-min-height)] min-w-0 items-center gap-[var(--pagination-gap)] rounded-[var(--pagination-radius)] border border-border bg-background",
        "px-[var(--pagination-padding-x)] py-[var(--pagination-padding-y)] text-foreground shadow-[var(--shadow-xs)]",
        "transition-[background-color,border-color,box-shadow,color,transform] duration-[var(--pagination-duration)] ease-[var(--pagination-easing)]",
        "hover:border-ring hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "motion-reduce:transition-none",
        isPrevious ? "justify-start text-left" : "justify-end text-right",
      )}
    >
      {isPrevious && (
        <Icon
          aria-hidden="true"
          className="size-[var(--pagination-icon-size)] shrink-0 text-muted-foreground transition-transform duration-[var(--pagination-duration)] group-hover:-translate-x-0.5 motion-reduce:transition-none"
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
          className="size-[var(--pagination-icon-size)] shrink-0 text-muted-foreground transition-transform duration-[var(--pagination-duration)] group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      )}
    </a>
  );
}

export function Pagination({
  previous,
  next,
  previousLabel = "Previous",
  nextLabel = "Next",
  className,
  style,
  "aria-label": ariaLabel = "Page navigation",
  ...props
}: PaginationProps) {
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
      <PaginationRail destination={previous} direction="previous" label={previousLabel} />
      <PaginationRail destination={next} direction="next" label={nextLabel} />
    </nav>
  );
}

Pagination.displayName = "Pagination";
