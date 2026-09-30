import { Check, Eye, LockClosed, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const LAYER_ICONS: ReadonlyArray<typeof Shield> = [Shield, LockClosed, Eye, Shield];

type EcosystemSafetyCopy = {
  title: string;
  layersCount: string;
  layers: Record<string, { label: string; stat: string }>;
  footer: string;
};

export function EcosystemSafetyGlyph({ copy }: SubpackageGlyphProps) {
  const t = copy as EcosystemSafetyCopy;
  const layers = LAYER_ICONS.map((icon, i) => ({ icon, ...t.layers[String(i)] }));

  return (
    <div
      className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-muted px-3 py-2.5"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[10px] text-foreground">{t.title}</span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">{t.layersCount}</span>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {layers.map((layer) => {
          const LayerIcon = layer.icon;
          return (
            <div
              key={layer.label}
              className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] bg-background px-1.5 py-1"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <LayerIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate text-[10px] text-foreground">{layer.label}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-[9px] text-muted-foreground">{layer.stat}</span>
                <Badge
                  variant="outline"
                  className="h-3.5 gap-0.5 border-success/30 bg-success/10 px-1 text-success-strong"
                >
                  <Check className="h-2.5 w-2.5" />
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      <div className="font-mono text-[9px] text-muted-foreground">{t.footer}</div>
    </div>
  );
}
