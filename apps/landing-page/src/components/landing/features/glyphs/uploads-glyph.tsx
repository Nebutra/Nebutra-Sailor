"use client";

import { ArrowUp, Box, Clock } from "@nebutra/icons";
import { Badge, Progress } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * UploadsGlyph
 *
 * Mini multipart upload progress dashboard. Shows a single file row, a
 * determinate progress bar at 62%, a mono part counter, and two chips
 * advertising the S3 backend + multipart/resumable transport.
 */
export function UploadsGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col justify-between gap-3 rounded-lg bg-[var(--neutral-2)] px-4 py-3"
      style={{ height: 160 }}
    >
      {/* Filename row */}
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--neutral-3)] text-[var(--neutral-11)]"
        >
          <Box className="h-3.5 w-3.5" />
        </span>
        <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
          <span className="truncate font-mono text-[12px] text-[var(--neutral-12)]">
            report-Q4-2025.pdf
          </span>
          <span className="shrink-0 font-mono text-[11px] text-[var(--neutral-11)]">48.2 MB</span>
        </div>
      </div>

      {/* Progress + caption */}
      <div className="space-y-1.5">
        <Progress value={62} max={100} size="sm" animated={false} />
        <div className="flex items-center justify-between font-mono text-[11px] text-[var(--neutral-11)]">
          <span className="inline-flex items-center gap-1">
            <ArrowUp className="h-3 w-3" />
            62% &middot; part 6 of 10
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            00:14
          </span>
        </div>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" size="sm" className="font-mono text-[10px]">
          S3
        </Badge>
        <Badge variant="outline" size="sm" className="font-mono text-[10px]">
          multipart &middot; resumable
        </Badge>
      </div>
    </div>
  );
}
