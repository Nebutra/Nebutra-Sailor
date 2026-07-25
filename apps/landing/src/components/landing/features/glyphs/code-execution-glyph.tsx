import { isZhUiLocale } from "@/lib/i18n/localized";

("use client");

import { ArrowRight, Check, Code, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * CodeExecutionGlyph — Sandboxed code execution visual.
 *
 * Left: mono code snippet (reduce over orders).
 * Middle: ArrowRight transition arrow.
 * Right: result panel showing computed total + execution time.
 * Top-right: outline runtime/isolation badge.
 * Footer: provider attribution.
 */
export const CodeExecutionGlyph = ({ locale }: SubpackageGlyphProps) => {
  const footerLabel = isZhUiLocale(locale)
    ? "Vercel Sandbox · 安全执行不可信代码"
    : "Vercel Sandbox · safe untrusted";
  const executedLabel = isZhUiLocale(locale) ? "47ms 内执行完成" : "executed in 47ms";

  return (
    <div
      className="relative flex w-full flex-col gap-2 overflow-hidden rounded-[var(--radius-lg)] bg-muted p-3"
      style={{ height: 160 }}
    >
      {/* Top-right runtime badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <Code className="h-3 w-3" />
          <span className="font-mono">sandbox.runCommand</span>
        </div>
        <Badge variant="outline" className="gap-1 text-[9px] font-mono">
          <Shield className="h-2.5 w-2.5" />
          Node22 · isolate · egress-blocked
        </Badge>
      </div>

      {/* Main row: code → arrow → result */}
      <div className="flex flex-1 items-center gap-2">
        {/* Code snippet */}
        <div className="flex-1 self-stretch rounded-[var(--radius-md)] border border-border bg-background p-2">
          <pre className="font-mono text-[9px] leading-[1.45] text-foreground">
            <code>
              <span className="text-muted-foreground">const</span>
              {" total = orders\n"}
              {"  ."}
              <span className="text-[color:hsl(var(--primary))]">filter</span>
              {"(o "}
              <span className="text-muted-foreground">{"=>"}</span>
              {" o.status === "}
              <span className="text-[color:var(--cyan-11)]">{"'paid'"}</span>
              {")\n"}
              {"  ."}
              <span className="text-[color:hsl(var(--primary))]">reduce</span>
              {"((s, o) "}
              <span className="text-muted-foreground">{"=>"}</span>
              {" s + o.amount, "}
              <span className="text-[color:var(--cyan-11)]">0</span>
              {")"}
            </code>
          </pre>
        </div>

        {/* Arrow */}
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />

        {/* Result panel */}
        <div className="flex w-[110px] shrink-0 flex-col justify-center gap-1 self-stretch rounded-[var(--radius-md)] border border-border bg-background p-2">
          <div className="flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-500" />
            <span className="font-mono text-[10px] font-semibold text-emerald-500">
              {"→ 12,840"}
            </span>
          </div>
          <span className="font-mono text-[8.5px] text-muted-foreground">{executedLabel}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="font-mono text-[9px] text-muted-foreground">{footerLabel}</div>
    </div>
  );
};
