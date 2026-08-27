"use client";

import { Box, Database, Globe, Shield } from "@nebutra/icons";
import { Badge, Progress } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/* -------------------------------------------------------------------------- *\
 *  StorageGlyph — mini object-storage bucket card.
 *
 *  Hints at @nebutra/storage: lower-tier object storage (S3 / R2 / GCS /
 *  Filebase) with put/get blob primitives.
 *
 *  Layout (height 160):
 *    ┌──────────────────────────────────────────────────┐
 *    │ [□] nebutra-exports          [⌾ us-east-1]      │  ← header
 *    │                                                  │
 *    │ reports/                              12.4 GB    │
 *    │ ████████████████░░░░░░░░░░  (62%)               │
 *    │                                                  │
 *    │ backups/                                847 MB   │
 *    │ ███░░░░░░░░░░░░░░░░░░░░░░░  (14%)               │
 *    │                                                  │
 *    │ Provider · S3                              [🛡]  │  ← footer
 *    └──────────────────────────────────────────────────┘
\* -------------------------------------------------------------------------- */

const COPY = {
  en: {
    region: "us-east-1",
    reports: "reports/",
    reportsSize: "12.4 GB",
    backups: "backups/",
    backupsSize: "847 MB",
    provider: "Provider · S3",
    encryptedSr: "Encrypted at rest",
  },
  zh: {
    region: "us-east-1",
    reports: "reports/",
    reportsSize: "12.4 GB",
    backups: "backups/",
    backupsSize: "847 MB",
    provider: "Provider · S3",
    encryptedSr: "静态加密",
  },
} as const;

export function StorageGlyph({ locale }: SubpackageGlyphProps) {
  const t = COPY[locale];

  return (
    <div
      className="flex w-full flex-col gap-2.5 rounded-[var(--radius-md)] bg-muted px-3 py-2.5"
      style={{ height: 160 }}
    >
      {/* Header — Box icon + bucket name + region pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Box className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-[11px] text-foreground">nebutra-exports</span>
        </div>
        <Badge variant="outline" className="h-5 gap-1 px-1.5 py-0 text-[10px] font-normal">
          <Globe className="h-2.5 w-2.5" />
          <span className="font-mono">{t.region}</span>
        </Badge>
      </div>

      {/* Bucket usage rows */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-muted-foreground">{t.reports}</span>
            <span className="font-mono text-[10px] tabular-nums text-foreground">
              {t.reportsSize}
            </span>
          </div>
          <Progress value={62} size="sm" animated={false} aria-label="reports/ usage 62%" />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-muted-foreground">{t.backups}</span>
            <span className="font-mono text-[10px] tabular-nums text-foreground">
              {t.backupsSize}
            </span>
          </div>
          <Progress
            value={14}
            size="sm"
            variant="secondary"
            animated={false}
            aria-label="backups/ usage 14%"
          />
        </div>
      </div>

      {/* Footer — provider tag + encryption shield */}
      <div className="mt-auto flex items-center justify-between border-t border-border pt-1.5">
        <div className="flex items-center gap-1">
          <Database className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="font-mono text-[10px] text-muted-foreground">{t.provider}</span>
        </div>
        <Shield className="h-3 w-3 text-muted-foreground" aria-label={t.encryptedSr} />
      </div>
    </div>
  );
}
