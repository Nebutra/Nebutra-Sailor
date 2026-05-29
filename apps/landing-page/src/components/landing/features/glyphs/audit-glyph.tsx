"use client";

import { Check, ChevronRight, Shield } from "@nebutra/icons";
import { Avatar, Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * AuditGlyph
 *
 * SOC 2-grade tamper-evident audit log preview. Header shows total
 * entry count with hash-verified shield. Three stacked log entries
 * pair relative timestamps with colored Avatar initials and a mono
 * `actor.action` chip. Footer hints at the SHA-256 hash chain.
 */
export function AuditGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-2 rounded-[var(--radius-lg)] bg-[var(--neutral-2)] px-3 py-2.5"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
        <span className="truncate font-mono text-[10px] text-[var(--neutral-11)]">
          audit log · 12,847 entries · hash-verified
        </span>
        <Check className="h-3 w-3 shrink-0 text-emerald-500" aria-hidden="true" />
      </div>

      {/* Entries */}
      <div className="flex flex-1 flex-col justify-between gap-1">
        <EntryRow
          time="2s"
          initials="AK"
          color="bg-blue-500/15 text-blue-600 dark:text-blue-400"
          action="admin.invite_user"
        />
        <EntryRow
          time="14m"
          initials="MR"
          color="bg-amber-500/15 text-amber-600 dark:text-amber-400"
          action="billing.cancel"
        />
        <EntryRow
          time="1h"
          initials="JT"
          color="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          action="auth.signin"
        />
      </div>

      {/* Footer */}
      <div className="font-mono text-[10px] text-[var(--neutral-10)]">→ hash-chained · SHA-256</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entry row
// ---------------------------------------------------------------------------

interface EntryRowProps {
  time: string;
  initials: string;
  color: string;
  action: string;
}

function EntryRow({ time, initials, color, action }: EntryRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 shrink-0 font-mono text-[10px] tabular-nums text-[var(--neutral-10)]">
        {time}
      </span>
      <Avatar size="xs" letter={initials} title={initials} className={color} />
      <Badge variant="gray-subtle" size="sm" className="font-mono text-[10px]">
        {action}
      </Badge>
      <ChevronRight
        className="ml-auto h-3 w-3 shrink-0 text-[var(--neutral-9)]"
        aria-hidden="true"
      />
    </div>
  );
}
