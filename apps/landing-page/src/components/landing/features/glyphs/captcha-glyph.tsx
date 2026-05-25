import { Robot as Bot, Check, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const CELLS = [
  { selected: true },
  { selected: false },
  { selected: true },
  { selected: false },
  { selected: true },
  { selected: true },
];

export function CaptchaGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="relative flex w-full items-stretch gap-4 overflow-hidden rounded-lg bg-[var(--neutral-2)] p-4"
      style={{ height: 160 }}
    >
      {/* Left: 3x2 challenge grid */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-[var(--neutral-11)]">
          <Bot className="h-3 w-3" />
          <span>Select traffic lights</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {CELLS.map((cell, idx) => (
            <div
              key={idx}
              className="relative h-7 w-7 overflow-hidden rounded-sm border"
              style={{
                background: cell.selected
                  ? "color-mix(in srgb, var(--brand-primary) 14%, var(--neutral-1))"
                  : "var(--neutral-3)",
                borderColor: cell.selected
                  ? "color-mix(in srgb, var(--brand-primary) 40%, transparent)"
                  : "var(--neutral-7)",
              }}
            >
              {cell.selected ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5" style={{ color: "var(--brand-primary)" }} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Right: verify panel */}
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="font-mono text-[10px] leading-tight text-[var(--neutral-12)]">
              Verify you&apos;re human
            </div>
            <div className="font-mono text-[9px] leading-tight text-[var(--neutral-10)]">
              challenge · 6 tiles
            </div>
          </div>
          <Shield className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--status-success)" }} />
        </div>

        <Badge
          className="w-fit gap-1 px-1.5 py-0.5 font-mono text-[9px]"
          style={{
            background: "color-mix(in srgb, var(--status-success) 14%, transparent)",
            color: "var(--status-success)",
            border: "1px solid color-mix(in srgb, var(--status-success) 30%, transparent)",
          }}
        >
          <Check className="h-2.5 w-2.5" />
          Verified
        </Badge>

        <div className="flex items-center gap-1 font-mono text-[9px] text-[var(--neutral-10)]">
          <span>Cloudflare Turnstile</span>
          <span aria-hidden>·</span>
          <span style={{ color: "var(--neutral-11)" }}>1.2s solve</span>
        </div>
      </div>
    </div>
  );
}
