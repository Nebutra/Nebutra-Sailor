"use client";

/**
 * Terminal-style visual showing the scaffold command output.
 */
export function ScaffoldVisual() {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/30 overflow-hidden font-mono text-xs">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/30">
        <span className="h-2 w-2 rounded-full bg-border/60" />
        <span className="h-2 w-2 rounded-full bg-border/60" />
        <span className="h-2 w-2 rounded-full bg-border/60" />
      </div>
      <div className="p-4 space-y-1 text-muted-foreground">
        <p>
          <span className="text-foreground">$</span> pnpm create nebutra-sailor
        </p>
        <p className="text-emerald-500">✔ Cloning monorepo...</p>
        <p className="text-emerald-500">✔ Installing 26 packages...</p>
        <p className="text-emerald-500">✔ Generating Prisma client...</p>
        <p className="text-primary font-semibold">⚡ Ready in 1.8s</p>
      </div>
    </div>
  );
}
