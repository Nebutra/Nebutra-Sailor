"use client";

import { Box, Check, LockClosed, Play, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import { isZhUiLocale } from "@/lib/i18n/localized";
import type { SubpackageGlyphProps } from "./types";

/**
 * SandboxRuntimeGlyph — Isolated container for untrusted code execution.
 *
 * Left column: container card with shield header + 3 isolation status lines
 *   (network, filesystem, timeout).
 * Right column: "Run" button mockup + last-exec result cell (time + exit code).
 * Footer: Vercel Sandbox attribution.
 */
export const SandboxRuntimeGlyph = ({ locale }: SubpackageGlyphProps) => {
  const footerLabel = isZhUiLocale(locale)
    ? "Vercel Sandbox · 安全执行不可信代码"
    : "Vercel Sandbox · safe untrusted";
  const runLabel = isZhUiLocale(locale) ? "运行" : "Run";
  const lastExecLabel = isZhUiLocale(locale) ? "上次执行" : "Last exec";

  return (
    <div
      className="relative flex w-full flex-col gap-2 overflow-hidden rounded-[var(--radius-lg)] bg-muted p-3"
      style={{ height: 160 }}
    >
      {/* Top row: identity */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <Box className="h-3 w-3" />
          <span className="font-mono">sandbox.create</span>
        </div>
        <Badge variant="outline" className="gap-1 text-[9px] font-mono">
          <LockClosed className="h-2.5 w-2.5" />
          isolate
        </Badge>
      </div>

      {/* Main row: container card | actions */}
      <div className="flex flex-1 items-stretch gap-2">
        {/* Container card */}
        <div className="flex flex-1 flex-col gap-1.5 rounded-[var(--radius-md)] border border-border bg-background p-2">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-[color:hsl(var(--primary))]" />
            <span className="font-mono text-[9px] font-semibold text-foreground">
              sandbox · node22 · 256MB · isolated
            </span>
          </div>
          <div className="flex flex-col gap-0.5 font-mono text-[9px] text-muted-foreground">
            <span>
              <span className="text-muted-foreground">·</span> network:{" "}
              <span className="text-[color:var(--cyan-11)]">egress-only</span>
            </span>
            <span>
              <span className="text-muted-foreground">·</span> filesystem:{" "}
              <span className="text-[color:var(--cyan-11)]">tmpfs</span>
            </span>
            <span>
              <span className="text-muted-foreground">·</span> timeout:{" "}
              <span className="text-[color:var(--cyan-11)]">30s</span>
            </span>
          </div>
        </div>

        {/* Right column: Run button + last exec cell */}
        <div className="flex w-[100px] shrink-0 flex-col gap-1.5">
          {/* Run button mockup */}
          <div
            className="flex items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-1.5 text-[10px] font-semibold text-white"
            style={{ background: "hsl(var(--primary))" }}
          >
            <Play className="h-2.5 w-2.5" />
            <span>{runLabel}</span>
          </div>

          {/* Live cell */}
          <div className="flex flex-1 flex-col justify-center gap-0.5 rounded-[var(--radius-md)] border border-border bg-background p-1.5">
            <span className="font-mono text-[8.5px] text-muted-foreground">{lastExecLabel}</span>
            <span className="font-mono text-[9px] font-semibold text-foreground">87ms</span>
            <div className="flex items-center gap-0.5">
              <Check className="h-2.5 w-2.5 text-success" />
              <span className="font-mono text-[8.5px] font-semibold text-success">exit 0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="font-mono text-[9px] text-muted-foreground">{footerLabel}</div>
    </div>
  );
};
