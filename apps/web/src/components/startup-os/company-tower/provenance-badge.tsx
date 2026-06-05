"use client";

import type { Icon } from "@nebutra/icons";
import { FileText, LockClosed, Robot, Sparkles, User } from "@nebutra/icons";
import { Badge, type BadgeProps, ColorBadge, type ColorBadgeVariant } from "@nebutra/ui/primitives";
import type { FieldProvenance, FieldStatus, Stability } from "./types";
import { stabilityLabel } from "./types";

/**
 * Quiet, restrained chips for the tower: provenance, field status, and stability
 * cadence. All three reuse the `Badge` / `ColorBadge` wheels — never hand-rolled
 * — with subtle token-backed variants only. Cadence text is `font-mono`
 * (precise-tool aesthetic); everything stays monochrome with a single accent.
 */

interface ProvenanceMeta {
  readonly icon: Icon;
  readonly label: string;
  readonly variant: NonNullable<BadgeProps["variant"]>;
}

/**
 * Provenance -> chip metadata. Subtle variants only; the icon (Geist, never
 * Phosphor — this is a product surface) doubles the label so color is never the
 * sole signal (a11y). 👤 user · ✦ ai · 📄 document · 🤖 agent.
 */
const PROVENANCE_META: Readonly<Record<FieldProvenance, ProvenanceMeta>> = {
  user: { icon: User, label: "user", variant: "green-subtle" },
  ai: { icon: Sparkles, label: "ai", variant: "blue-subtle" },
  document: { icon: FileText, label: "document", variant: "outline" },
  agent: { icon: Robot, label: "agent", variant: "gray-subtle" },
};

export interface ProvenanceBadgeProps {
  readonly provenance: FieldProvenance;
  readonly className?: string;
}

/** Where a field value came from, as a quiet icon + label chip. */
export function ProvenanceBadge({ provenance, className }: ProvenanceBadgeProps) {
  const meta = PROVENANCE_META[provenance];
  const Glyph = meta.icon;
  return (
    <Badge
      variant={meta.variant}
      size="sm"
      icon={<Glyph aria-hidden="true" />}
      className={className}
    >
      {meta.label}
    </Badge>
  );
}

ProvenanceBadge.displayName = "ProvenanceBadge";

interface StatusMeta {
  readonly label: string;
  readonly variant: NonNullable<BadgeProps["variant"]>;
  readonly icon?: Icon;
}

/**
 * Field lifecycle -> chip. `locked` carries the lock glyph (human-approved);
 * `ready` is the single accent (blue); draft/empty stay neutral and recessive.
 */
const STATUS_META: Readonly<Record<FieldStatus, StatusMeta>> = {
  empty: { label: "empty", variant: "gray-subtle" },
  draft: { label: "draft", variant: "amber-subtle" },
  ready: { label: "ready", variant: "blue-subtle" },
  locked: { label: "locked", variant: "gray-subtle", icon: LockClosed },
};

export interface StatusBadgeProps {
  readonly status: FieldStatus;
  readonly className?: string;
}

/** A field's lifecycle status, as a restrained chip. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  const Glyph = meta.icon;
  return (
    <Badge
      variant={meta.variant}
      size="sm"
      icon={Glyph ? <Glyph aria-hidden="true" /> : undefined}
      className={className}
    >
      {meta.label}
    </Badge>
  );
}

StatusBadge.displayName = "StatusBadge";

export interface StabilityBadgeProps {
  readonly stability: Stability;
  readonly className?: string;
}

/**
 * The layer's change cadence (century -> weekly), as a quiet Vercel-style
 * `ColorBadge`. The cadence text is `font-mono` (it is data, not prose).
 * `capitalize={false}` keeps the mono token verbatim ("1-3y", "half-year").
 */
export function StabilityBadge({ stability, className }: StabilityBadgeProps) {
  const variant: ColorBadgeVariant = "gray-subtle";
  return (
    <ColorBadge
      variant={variant}
      size="sm"
      capitalize={false}
      className={`font-mono ${className ?? ""}`.trim()}
    >
      {stabilityLabel(stability)}
    </ColorBadge>
  );
}

StabilityBadge.displayName = "StabilityBadge";
