import { Bell, ChartActivity, Check } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const TOTAL_BARS = 90;
const AMBER_INDICES = new Set<number>([23, 61]);

export function StatusGlyph(_props: SubpackageGlyphProps) {
  const bars = Array.from({ length: TOTAL_BARS }, (_, index) => index);

  return (
    <div
      className="flex w-full flex-col gap-3 rounded-[var(--radius-md)] bg-muted p-3"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ChartActivity className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Nebutra Status</span>
        </div>
        <Badge
          variant="outline"
          className="gap-1 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-medium text-success"
        >
          <Check className="h-2.5 w-2.5" />
          All systems operational
        </Badge>
      </div>

      <div className="flex flex-1 items-end gap-[1px]">
        {bars.map((index) => {
          const isAmber = AMBER_INDICES.has(index);
          return (
            <div
              key={index}
              className={`h-full flex-1 rounded-[1px] ${
                isAmber ? "bg-amber-500/70" : "bg-emerald-500/70"
              }`}
              style={{ minWidth: 2 }}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground">
        <span>99.97% uptime · 90 days</span>
        <Bell className="h-3 w-3" />
      </div>
    </div>
  );
}
