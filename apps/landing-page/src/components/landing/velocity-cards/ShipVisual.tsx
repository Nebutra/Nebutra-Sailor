"use client";

/**
 * Premium Deploy status visual showing the ship phase.
 * Fully aligned with semantic CSS tokens.
 */
export function ShipVisual() {
  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-border/80 bg-background/90 backdrop-blur-xl shadow-2xl p-6 font-mono text-sm overflow-hidden relative group">
      {/* Decorative radar/ping background effect using primary color */}
      <div className="absolute top-8 right-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border border-primary/5 rounded-full scale-150 pointer-events-none" />

      <div className="flex items-center gap-3 mb-6 relative z-10 border-b border-border/50 pb-4">
        <div className="relative flex h-3 w-3 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </div>
        <span className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
          Production <span className="text-muted-foreground font-normal text-xs">Edge Network</span>
        </span>
      </div>

      <div className="space-y-4 text-muted-foreground relative z-10">
        <div className="flex justify-between items-center bg-muted/40 p-2.5 rounded-lg border border-border/40">
          <span className="flex items-center gap-2">
            <span className="text-foreground font-semibold">▲ vercel</span> deploy --prod
          </span>
          <span className="flex items-center justify-center h-5 w-5 rounded-[4px] bg-primary/10 text-primary text-[10px] font-bold">
            ✓
          </span>
        </div>
        <div className="flex justify-between items-center px-1">
          <span className="flex items-center gap-2 text-foreground font-medium">
            <span className="text-primary opacity-80">⬡</span> nebutra.com
          </span>
          <span className="text-primary font-bold text-xs uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> LIVE
          </span>
        </div>
        <div className="flex justify-between items-center px-1 pt-2 border-t border-border/40">
          <span className="flex items-center gap-2">
            <span className="text-primary opacity-80">⚡</span> Edge: 38 regions
          </span>
          <span className="text-muted-foreground/80 text-xs font-semibold bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">~50ms TTFB</span>
        </div>
      </div>
    </div>
  );
}
