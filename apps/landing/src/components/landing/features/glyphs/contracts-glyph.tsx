"use client";

import { Code } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * ContractsGlyph
 *
 * Typed events table preview. Four rows pair an event name (blue-subtle
 * `event` badge) with its payload schema. Footer hints at the
 * TypeScript-validated, zero-runtime nature of the contract layer.
 */

type EventRow = {
  name: string;
  payload: string;
};

const EVENTS: ReadonlyArray<EventRow> = [
  { name: "invoice.paid", payload: "{ id, amount, currency }" },
  { name: "user.created", payload: "{ id, email }" },
  { name: "subscription.canceled", payload: "{ tenantId, reason }" },
  { name: "feature.gated", payload: "{ flag, actorId }" },
];

export function ContractsGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 rounded-[var(--radius-lg)] bg-muted px-3 py-2"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <Code className="h-3 w-3" />
          contracts.events.ts
        </span>
        <Badge variant="outline" size="sm" className="font-mono text-[9px]">
          4
        </Badge>
      </div>

      {/* Event rows */}
      <ul className="flex min-h-0 flex-1 flex-col justify-between gap-1">
        {EVENTS.map((row) => (
          <li
            key={row.name}
            className="flex items-center gap-2 rounded-[var(--radius-md)] bg-background px-2 py-1"
          >
            <Badge
              variant="secondary"
              size="sm"
              className="shrink-0 bg-[var(--blue-3)] font-mono text-[9px] text-primary"
            >
              event
            </Badge>
            <span className="shrink-0 truncate font-mono text-[10px] text-foreground">
              {row.name}
            </span>
            <span className="ml-auto min-w-0 truncate text-right font-mono text-[10px] text-muted-foreground">
              {row.payload}
            </span>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <p className="text-center font-mono text-[9px] text-muted-foreground">
        TypeScript-validated &middot; zero-runtime contracts
      </p>
    </div>
  );
}
