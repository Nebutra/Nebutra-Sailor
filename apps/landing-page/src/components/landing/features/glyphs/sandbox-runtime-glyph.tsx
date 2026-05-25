"use client";

import { Box, Check, LockClosed, Play, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
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
  const footerLabel =
    locale === "zh" ? "Vercel Sandbox · 安全执行不可信代码" : "Vercel Sandbox · safe untrusted";
  const runLabel = locale === "zh" ? "运行" : "Run";
  const lastExecLabel = locale === "zh" ? "上次执行" : "Last exec";

  return (
    <div
      className="relative flex w-full flex-col gap-2 overflow-hidden rounded-lg bg-[var(--neutral-2)] p-3"
      style={{ height: 160 }}
    >
      {/* Top row: identity */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--neutral-11)]">
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
        <div className="flex flex-1 flex-col gap-1.5 rounded-md border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-2">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-[color:var(--blue-9)]" />
            <span className="font-mono text-[9px] font-semibold text-[var(--neutral-12)]">
              sandbox · node22 · 256MB · isolated
            </span>
          </div>
          <div className="flex flex-col gap-0.5 font-mono text-[9px] text-[var(--neutral-11)]">
            <span>
              <span className="text-[var(--neutral-10)]">·</span> network:{" "}
              <span className="text-[color:var(--cyan-11)]">egress-only</span>
            </span>
            <span>
              <span className="text-[var(--neutral-10)]">·</span> filesystem:{" "}
              <span className="text-[color:var(--cyan-11)]">tmpfs</span>
            </span>
            <span>
              <span className="text-[var(--neutral-10)]">·</span> timeout:{" "}
              <span className="text-[color:var(--cyan-11)]">30s</span>
            </span>
          </div>
        </div>

        {/* Right column: Run button + last exec cell */}
        <div className="flex w-[100px] shrink-0 flex-col gap-1.5">
          {/* Run button mockup */}
          <div
            className="flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold text-white"
            style={{ background: "var(--brand-gradient)" }}
          >
            <Play className="h-2.5 w-2.5" />
            <span>{runLabel}</span>
          </div>

          {/* Live cell */}
          <div className="flex flex-1 flex-col justify-center gap-0.5 rounded-md border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-1.5">
            <span className="font-mono text-[8.5px] text-[var(--neutral-10)]">{lastExecLabel}</span>
            <span className="font-mono text-[9px] font-semibold text-[var(--neutral-12)]">
              87ms
            </span>
            <div className="flex items-center gap-0.5">
              <Check className="h-2.5 w-2.5 text-emerald-500" />
              <span className="font-mono text-[8.5px] font-semibold text-emerald-500">exit 0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="font-mono text-[9px] text-[var(--neutral-10)]">{footerLabel}</div>
    </div>
  );
};
