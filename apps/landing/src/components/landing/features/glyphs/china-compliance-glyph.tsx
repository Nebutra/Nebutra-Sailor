"use client";

import { Check, Clock, Globe, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    title: "China compliance",
    ready: "Ready",
    rows: [
      { kind: "ok" as const, label: "ICP filing approved", mono: "京ICP备2024xxxx号" },
      { kind: "ok" as const, label: "MIIT registration", mono: "工信部备案" },
      { kind: "ok" as const, label: "In-country DB residency (Beijing region)" },
      { kind: "pending" as const, label: "Real-name verification pending" },
    ],
    footer: "support · gov.cn integrations",
  },
  zh: {
    title: "中国合规",
    ready: "Ready",
    rows: [
      { kind: "ok" as const, label: "ICP 备案已批准", mono: "京ICP备2024xxxx号" },
      { kind: "ok" as const, label: "工信部登记", mono: "工信部备案" },
      { kind: "ok" as const, label: "数据境内存储（北京区域）" },
      { kind: "pending" as const, label: "实名认证待审核" },
    ],
    footer: "support · gov.cn integrations",
  },
} as const;

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
export function ChinaComplianceGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

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
        {copy.rows.map((row) => (
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
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
      ) : (
        <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
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
