import { Bell, Lightning, Sparkles } from "@nebutra/icons";
import { Badge, StatusDot } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const WAVEFORM_HEIGHTS = [30, 55, 18, 68, 42, 80, 25, 60, 38, 72, 22, 50, 65, 32, 78, 28] as const;

export function VoiceRealtimeGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="relative flex w-full flex-col gap-3 overflow-hidden rounded-[var(--radius-lg)] bg-background px-4 py-3"
      style={{ height: 160 }}
    >
      {/* Top row: live indicator + timer + status */}
      <div className="flex items-center gap-2">
        <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-danger)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-danger)]" />
        </span>
        <Bell className="h-3.5 w-3.5 text-[var(--status-danger)]" aria-hidden />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground">
          LIVE · 0:42
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <StatusDot state="READY" />
          <span className="text-[10px] text-muted-foreground">connected</span>
        </div>
      </div>

      {/* Waveform */}
      <div className="flex h-10 flex-1 items-center justify-center gap-[3px]">
        {WAVEFORM_HEIGHTS.map((h, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full"
            style={{
              height: `${h}%`,
              background: i % 2 === 0 ? "hsl(var(--primary))" : "var(--brand-accent)",
              opacity: 0.85,
            }}
          />
        ))}
      </div>

      {/* Chips */}
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="gap-1 text-[10px]">
          <Sparkles className="h-3 w-3" aria-hidden />
          Aria voice
        </Badge>
        <Badge variant="outline" className="gap-1 font-mono text-[10px]">
          <Lightning className="h-3 w-3" aria-hidden />
          &lt;120ms latency
        </Badge>
      </div>

      {/* Footer */}
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        OpenAI Realtime · WebRTC · push-to-talk
      </div>
    </div>
  );
}
