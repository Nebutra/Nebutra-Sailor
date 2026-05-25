import { ArrowRight, Check, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const BAR_COUNT = 32;

// Deterministic pseudo-waveform heights (4-24px), alternating tint.
const BAR_HEIGHTS: ReadonlyArray<number> = [
  8, 14, 6, 18, 12, 22, 10, 16, 4, 20, 14, 8, 24, 12, 6, 18, 10, 22, 14, 8, 16, 12, 20, 6, 18, 10,
  14, 24, 8, 16, 12, 20,
];

const PIPELINE_STEPS_EN = ["transcribe", "denoise", "master"] as const;
const PIPELINE_STEPS_ZH = ["转写", "降噪", "母带"] as const;

export function AudioPipelineGlyph({ locale }: SubpackageGlyphProps) {
  const steps = locale === "zh" ? PIPELINE_STEPS_ZH : PIPELINE_STEPS_EN;

  return (
    <div
      className="relative flex w-full flex-col justify-between overflow-hidden rounded-md bg-[var(--neutral-2)] px-4 py-3"
      style={{ height: 160 }}
    >
      {/* Header sparkle hint */}
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--neutral-11)]">
        <Sparkles className="h-3 w-3" />
        <span>audio pipeline</span>
      </div>

      {/* Waveform — 32 vertical bars, centered */}
      <div className="flex items-center justify-between gap-[2px]" aria-hidden="true">
        {BAR_HEIGHTS.slice(0, BAR_COUNT).map((height, i) => (
          <div
            key={i}
            className="w-[3px] flex-1 rounded-full"
            style={{
              height: `${height}px`,
              background: i % 2 === 0 ? "var(--brand-primary)" : "var(--neutral-7)",
              opacity: i % 2 === 0 ? 0.9 : 0.55,
            }}
          />
        ))}
      </div>

      {/* Pipeline steps */}
      <div className="flex items-center justify-between gap-1">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-1">
            <Badge
              variant="outline"
              className="gap-1 border-[var(--neutral-7)] bg-[var(--neutral-1)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--neutral-12)]"
            >
              <Check className="h-2.5 w-2.5 text-[var(--brand-accent)]" />
              {step}
            </Badge>
            {i < steps.length - 1 ? (
              <ArrowRight className="h-3 w-3 text-[var(--neutral-9)]" />
            ) : null}
          </div>
        ))}
      </div>

      {/* Footer mono toolchain */}
      <div className="font-mono text-[9px] tracking-tight text-[var(--neutral-10)]">
        Whisper · RNNoise · FFmpeg
      </div>
    </div>
  );
}
