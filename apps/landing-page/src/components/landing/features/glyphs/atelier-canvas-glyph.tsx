import { BlendMode, Eye, EyeOff, Image } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const LAYERS = [
  { name: "background", visible: true },
  { name: "brushwork", visible: true },
  { name: "effects", visible: false },
] as const;

const TILE_TINTS = [
  "bg-[var(--blue-4)] border-[var(--blue-7)]",
  "bg-[var(--cyan-4)] border-[var(--cyan-7)]",
  "bg-[var(--purple-4)] border-[var(--purple-7)]",
] as const;

export function AtelierCanvasGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[var(--radius-md)] bg-neutral-2 px-3 py-2.5"
      style={{ height: 160 }}
    >
      <div className="absolute right-2 top-2 z-10">
        <Badge variant="gray-subtle" size="sm">
          <BlendMode size={10} className="mr-1" />
          ai-brushes
        </Badge>
      </div>

      <div className="mt-5 flex items-start gap-3">
        <div className="relative h-[80px] w-[120px] shrink-0 rounded-[var(--radius-sm)] border border-neutral-7 bg-neutral-1">
          <div className="absolute left-1.5 top-1.5 flex items-center gap-1 font-mono text-[8.5px] text-neutral-9">
            <Image size={9} />
            <span>canvas</span>
          </div>
          {TILE_TINTS.map((tint, i) => (
            <div
              key={tint}
              className={`absolute h-[28px] w-[44px] rounded-[2px] border ${tint}`}
              style={{
                left: 18 + i * 4,
                top: 30 + i * 4,
              }}
            />
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1 font-mono text-[10.5px] leading-tight">
          {LAYERS.map((layer) => {
            const VisibilityIcon = layer.visible ? Eye : EyeOff;
            return (
              <div
                key={layer.name}
                className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-neutral-1 px-1.5 py-1"
              >
                <span className="text-neutral-9">·</span>
                <span
                  className={`flex-1 truncate ${
                    layer.visible ? "text-neutral-12" : "text-neutral-9"
                  }`}
                >
                  {layer.name}
                </span>
                <VisibilityIcon
                  size={11}
                  className={`shrink-0 ${layer.visible ? "text-neutral-11" : "text-neutral-8"}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-1.5 left-3 right-3 font-mono text-[9.5px] text-neutral-9">
        layers · masks · ai-brushes
      </div>
    </div>
  );
}
