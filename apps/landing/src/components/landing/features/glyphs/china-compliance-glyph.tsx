"use client";

import { Check, Clock, Globe, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

// Regulatory codes are proper names — same on every locale.
const ROWS: ReadonlyArray<{ kind: "ok" | "pending"; mono?: string }> = [
  { kind: "ok", mono: "京ICP备2024xxxx号" },
  { kind: "ok", mono: "工信部备案" },
  { kind: "ok" },
  { kind: "pending" },
];

type ChinaComplianceCopy = {
  title: string;
  ready: string;
  rows: Record<string, { label: string }>;
  footer: string;
};

type Row = { kind: "ok" | "pending"; label: string; mono?: string };

/**
 * ChinaComplianceGlyph
 *
 * Compliance checklist preview for the China-region ops sub-package.
 * Header pairs a Shield with the locale-aware title plus a green-subtle
 * "Ready" Badge. Four checklist rows: three approved items (Check) — two
 * with mono regulatory codes — and one pending real-name verification
 * with amber Clock. Footer hints at gov.cn integration support.
 */
export function ChinaComplianceGlyph({ copy: rawCopy }: SubpackageGlyphProps) {
  const copy = rawCopy as ChinaComplianceCopy;
  const rows: Row[] = ROWS.map((row, i) => ({ ...row, label: copy.rows[i]?.label ?? "" }));

  return (
    <div
      aria-hidden
      className="flex w-full flex-col gap-2 rounded-[var(--radius-lg)] bg-muted px-3 py-2.5"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate text-[11px] font-medium text-foreground">{copy.title}</span>
        <Badge variant="green-subtle" size="sm" className="ml-auto font-mono text-[10px]">
          {copy.ready}
        </Badge>
      </div>

      {/* Checklist rows */}
      <div className="flex flex-1 flex-col justify-between gap-1">
        {rows.map((row) => (
          <ChecklistRow key={row.label} row={row} />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
        <Globe className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{copy.footer}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checklist row
// ---------------------------------------------------------------------------

interface ChecklistRowProps {
  row: Row;
}

function ChecklistRow({ row }: ChecklistRowProps) {
  const isOk = row.kind === "ok";
  const mono = "mono" in row ? row.mono : undefined;

  return (
    <div className="flex items-center gap-2">
      {isOk ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-success-strong" aria-hidden="true" />
      ) : (
        <Clock className="h-3.5 w-3.5 shrink-0 text-warning-strong" aria-hidden="true" />
      )}
      <span className="truncate text-[11px] text-foreground">{row.label}</span>
      {mono ? (
        <Badge variant="gray-subtle" size="sm" className="ml-auto font-mono text-[10px]">
          {mono}
        </Badge>
      ) : !isOk ? (
        <Badge variant="amber-subtle" size="sm" className="ml-auto font-mono text-[10px]">
          pending
        </Badge>
      ) : null}
    </div>
  );
}
