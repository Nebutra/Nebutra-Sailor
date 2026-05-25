"use client";

import { Check, Clock, Connection, RefreshClockwise } from "@nebutra/icons";
import { Badge, StatusBadge, type StatusBadgeProps, StatusDot } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * WebhooksGlyph
 *
 * Mini outbound delivery log. Top row shows a truncated endpoint URL,
 * followed by three stacked delivery rows (two successful 200s and one
 * 503 currently retrying). Each row pairs an HTTP-code Badge with a
 * StatusBadge for the event type / latency, so color and text both
 * encode the delivery outcome.
 */
export function WebhooksGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-2 rounded-lg bg-[var(--neutral-2)] px-3 py-2.5"
      style={{ height: 160 }}
    >
      {/* Endpoint URL */}
      <div className="flex items-center gap-2">
        <Connection className="h-3.5 w-3.5 shrink-0 text-[var(--neutral-11)]" aria-hidden="true" />
        <span className="truncate font-mono text-[11px] text-[var(--neutral-12)]">
          https://hooks.app.com/v1/billing
        </span>
      </div>

      {/* Delivery rows */}
      <div className="flex flex-1 flex-col justify-between gap-1.5">
        <DeliveryRow
          code="200"
          codeVariant="green-subtle"
          event="invoice.paid"
          status="success"
          leftIcon={Check}
          rightIcon={Clock}
          rightLabel="124ms · 2m ago"
        />
        <DeliveryRow
          code="200"
          codeVariant="green-subtle"
          event="user.created"
          status="success"
          leftIcon={Check}
          rightIcon={Clock}
          rightLabel="88ms · 18m ago"
        />
        <DeliveryRow
          code="503"
          codeVariant="amber-subtle"
          event="subscription.canceled"
          status="warning"
          leftIcon={RefreshClockwise}
          rightIcon={Clock}
          rightLabel="retry 2/5 · 1h ago"
          retrying
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delivery row
// ---------------------------------------------------------------------------

type RowIcon = NonNullable<StatusBadgeProps["leftIcon"]>;

interface DeliveryRowProps {
  code: string;
  codeVariant: "green-subtle" | "amber-subtle" | "red-subtle";
  event: string;
  status: "success" | "warning";
  leftIcon: RowIcon;
  rightIcon: RowIcon;
  rightLabel: string;
  retrying?: boolean;
}

function DeliveryRow({
  code,
  codeVariant,
  event,
  status,
  leftIcon,
  rightIcon,
  rightLabel,
  retrying,
}: DeliveryRowProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={codeVariant} size="sm" className="font-mono text-[10px] tabular-nums">
        {code}
      </Badge>
      <span className="truncate font-mono text-[11px] text-[var(--neutral-12)]">{event}</span>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {retrying && <StatusDot state="BUILDING" decorative />}
        <StatusBadge
          status={status}
          leftIcon={leftIcon}
          leftLabel={status === "success" ? "OK" : "Retry"}
          rightIcon={rightIcon}
          rightLabel={rightLabel}
          className="!py-0.5 !px-2 !text-[10px] [&_svg]:!size-3"
        />
      </div>
    </div>
  );
}
