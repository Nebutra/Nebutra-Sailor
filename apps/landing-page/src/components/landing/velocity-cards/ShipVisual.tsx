"use client";

/**
 * Deploy status visual showing the ship phase.
 */
export function ShipVisual() {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/30 p-4 font-mono text-xs">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-semibold text-foreground">Production</span>
      </div>
      <div className="space-y-2 text-muted-foreground">
        <div className="flex justify-between">
          <span>▲ vercel deploy --prod</span>
          <span className="text-emerald-500">✓</span>
        </div>
        <div className="flex justify-between">
          <span>⬡ nebutra.com</span>
          <span className="text-emerald-500">live</span>
        </div>
        <div className="flex justify-between">
          <span>⚡ Edge: 38 regions</span>
          <span className="text-muted-foreground/60">~50ms</span>
        </div>
      </div>
    </div>
  );
}
