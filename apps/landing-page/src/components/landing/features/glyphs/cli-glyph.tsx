"use client";

import { Check, TerminalWindow } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const LINES: ReadonlyArray<{ kind: "cmd" | "ok"; text: string }> = [
  { kind: "cmd", text: "$ nebutra deploy --tenant org_abc" },
  { kind: "ok", text: "Checking environment" },
  { kind: "ok", text: "Building project (12.4s)" },
  { kind: "ok", text: "Uploading artifacts" },
  { kind: "ok", text: "Deployed to https://app.nebutra.com" },
];

export function CliGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      style={{ height: 160 }}
      className="relative w-full overflow-hidden rounded-lg bg-[oklch(0.16_0.012_250)]"
    >
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-white/40">
          <TerminalWindow className="h-3.5 w-3.5" />
          <span className="font-mono text-[10px] uppercase tracking-wider">terminal</span>
        </div>
        <Badge
          variant="outline"
          className="h-5 border-white/10 px-1.5 font-mono text-[10px] text-white/60"
        >
          cli@1.4.2
        </Badge>
      </div>

      {/* Session body */}
      <div className="flex flex-col gap-0.5 px-3 py-2 font-mono text-[11px] leading-[1.35]">
        {LINES.map((line, i) =>
          line.kind === "cmd" ? (
            <div key={i} className="truncate text-muted-foreground/90">
              {line.text}
            </div>
          ) : (
            <div key={i} className="flex items-center gap-1.5 truncate">
              <Check className="h-3 w-3 shrink-0 text-emerald-500" />
              <span className="truncate text-muted-foreground">{line.text}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
