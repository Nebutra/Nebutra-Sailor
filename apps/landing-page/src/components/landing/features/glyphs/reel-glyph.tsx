import { Code, Image, Play, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type LayerRow = {
  tag: string;
  icon: typeof Image;
  body: string;
  meta: string;
};

const LAYERS: ReadonlyArray<LayerRow> = [
  {
    tag: "Image",
    icon: Image,
    body: "hero",
    meta: "3s · fade",
  },
  {
    tag: "VO",
    icon: Sparkles,
    body: "aria voice",
    meta: "8s",
  },
  {
    tag: "Captions",
    icon: Code,
    body: "kinetic",
    meta: "auto-sync",
  },
];

export function ReelGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="relative flex w-full flex-col gap-2 rounded-[var(--radius-lg)] bg-muted p-3"
      style={{ height: 160 }}
    >
      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* Left: phone-frame preview (9:16) */}
        <div
          className="relative flex shrink-0 items-center justify-center rounded-[10px] border border-border bg-background shadow-sm"
          style={{ width: 60, height: 100 }}
        >
          <div
            className="absolute inset-1 rounded-[7px]"
            style={{ background: "hsl(var(--primary))", opacity: 0.85 }}
            aria-hidden
          />
          <div className="absolute inset-x-2 top-2 h-1 rounded-full bg-white/40" aria-hidden />
          <div className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white/95 text-foreground shadow">
            <Play className="h-2.5 w-2.5" />
          </div>
          <div className="absolute inset-x-2 bottom-2 h-1 rounded-full bg-white/30" aria-hidden />
          <div
            className="absolute inset-x-2 bottom-2 h-1 w-1/3 rounded-full bg-white"
            aria-hidden
          />
        </div>

        {/* Right: layer rows */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {LAYERS.map((layer) => {
            const Icon = layer.icon;
            return (
              <div
                key={layer.tag}
                className="flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-background px-2 py-1.5"
              >
                <Badge
                  variant="outline"
                  className="h-4 shrink-0 gap-1 px-1.5 text-[9px] font-medium uppercase tracking-wide"
                >
                  <Icon className="h-2.5 w-2.5" />
                  {layer.tag}
                </Badge>
                <span className="min-w-0 truncate text-[10px] text-foreground">{layer.body}</span>
                <span className="ml-auto shrink-0 font-mono text-[9px] text-muted-foreground">
                  {layer.meta}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
        <span>Remotion</span>
        <span aria-hidden>·</span>
        <span>9:16</span>
        <span aria-hidden>·</span>
        <span>60fps</span>
      </div>
    </div>
  );
}
