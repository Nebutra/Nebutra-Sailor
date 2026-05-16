"use client";

import type { ReactNode } from "react";
import { BrandMark } from "../primitives/brand-mark";
import { EmptyState as EmptyStatePrimitive } from "../primitives/empty-state";
import { cn } from "../utils/cn";

type Tone = "default" | "branded" | "subtle";
type Size = "sm" | "md" | "lg";

export interface EmptyStateProps {
  /** Primary message. */
  title: string;
  /** Supporting description. */
  description?: string;
  /** Visual anchor. When omitted and `tone="branded"`, a default `<BrandMark>` is rendered. */
  mascot?: ReactNode;
  /** Inline icon shown above the title. Ignored when `mascot` is provided. */
  icon?: ReactNode;
  /** Primary call-to-action node. */
  action?: ReactNode;
  /** Secondary call-to-action node. */
  secondaryAction?: ReactNode;
  /**
   * Visual tone.
   * - `default`: neutral bordered state
   * - `branded`: BrandMark anchor for first-touch panels
   * - `subtle`: quieter inline state
   */
  tone?: Tone;
  /** Size variant. */
  size?: Size;
  /** Extra classes for the root element. */
  className?: string;
}

const toneVariant: Record<Tone, "blank-slate" | "informational" | "guide"> = {
  default: "blank-slate",
  branded: "informational",
  subtle: "guide",
};

/**
 * EmptyState — layout-compatible wrapper around the canonical compound
 * primitive. New composition work should prefer `EmptyState.Root` from
 * `@nebutra/ui/primitives`; product layout code can keep this simpler API.
 */
export function EmptyState({
  title,
  description,
  mascot,
  icon,
  action,
  secondaryAction,
  tone = "default",
  size = "md",
  className,
}: EmptyStateProps) {
  const visual =
    mascot ??
    icon ??
    (tone === "branded" ? <BrandMark size={size === "lg" ? "lg" : "md"} /> : null);

  return (
    <EmptyStatePrimitive.Root
      action={action}
      className={cn(tone === "subtle" && "border-0 bg-transparent", className)}
      description={description}
      icon={visual ? <EmptyStatePrimitive.Icon icon={visual} /> : undefined}
      link={secondaryAction}
      size={size}
      title={title}
      variant={toneVariant[tone]}
    />
  );
}
