import { ArrowRight, Image as ImageIcon, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const OPERATIONS = ["Resize", "Upscale", "Compress"] as const;

export function ImagePipelineGlyph(_props: SubpackageGlyphProps) {
  return (
    <div className="flex w-full flex-col justify-between gap-2 px-3 py-3" style={{ height: 160 }}>
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex flex-1 flex-col gap-1 rounded-md border border-border bg-muted px-2 py-1.5"
          style={{ minHeight: 60 }}
        >
          <div className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">Original</span>
          </div>
          <div className="flex h-6 items-center justify-center rounded-sm bg-background/60">
            <span className="text-[9px] font-mono text-muted-foreground">1024px</span>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">4.8 MB</span>
        </div>

        <ArrowRight className="h-4 w-4 shrink-0 text-[color:var(--brand-primary)]" aria-hidden />

        <div
          className="flex flex-1 flex-col gap-1 rounded-md border border-[color:var(--brand-primary)]/30 bg-[color:var(--brand-primary)]/10 px-2 py-1.5"
          style={{ minHeight: 60 }}
        >
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[color:var(--brand-primary)]" />
            <span className="text-[10px] font-medium text-[color:var(--brand-primary)]">
              Optimized
            </span>
          </div>
          <div className="flex h-6 items-center justify-center rounded-sm bg-background/60">
            <span className="text-[9px] font-mono text-foreground">1024px WebP</span>
          </div>
          <span className="text-[9px] font-mono text-[color:var(--brand-primary)]">240 KB</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1">
        {OPERATIONS.map((op) => (
          <Badge key={op} variant="outline" className="text-[9px] font-mono px-1.5 py-0">
            {op}
          </Badge>
        ))}
      </div>

      <div className="text-center text-[9px] font-mono text-muted-foreground">
        Sharp · Vercel Image · WebP/AVIF
      </div>
    </div>
  );
}
