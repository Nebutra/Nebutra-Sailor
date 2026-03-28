"use client";

/**
 * Premium Terminal-style visual showing the scaffold command output.
 * Fully aligned with the semantic Light/Dark design system.
 */
export function ScaffoldVisual() {
  return (
    <div className="w-full max-w-[400px] rounded-2xl border border-border/80 bg-background/50 backdrop-blur-md overflow-hidden shadow-2xl shadow-primary/5 font-mono text-sm">
      
      {/* MacOS Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex gap-1.5 opacity-80">
          <span className="h-2.5 w-2.5 rounded-full border border-border bg-muted-foreground/20" />
          <span className="h-2.5 w-2.5 rounded-full border border-border bg-muted-foreground/20" />
          <span className="h-2.5 w-2.5 rounded-full border border-border bg-muted-foreground/20" />
        </div>
        <div className="mx-auto text-[10px] text-muted-foreground font-sans tracking-wide">bash - setup</div>
      </div>

      {/* Terminal Body */}
      <div className="p-6 space-y-2.5 text-foreground">
        <p className="flex gap-3">
          <span className="text-muted-foreground select-none">~</span>
          <span>
            <span className="text-primary font-medium">pnpm</span> create nebutra-sailor
          </span>
        </p>
        <div className="pl-5 space-y-2 mt-2">
          <p className="text-muted-foreground flex items-center gap-2">
            <span className="text-[10px] text-primary">✔</span> Cloning monorepo...
          </p>
          <p className="text-muted-foreground flex items-center gap-2">
            <span className="text-[10px] text-primary">✔</span> Installing 26 packages...
          </p>
          <p className="text-muted-foreground flex items-center gap-2">
            <span className="text-[10px] text-primary">✔</span> Generating Prisma client...
          </p>
        </div>
        <p className="mt-4 pt-3 border-t border-border/50 text-foreground font-semibold flex items-center gap-2">
          <span className="text-primary">⚡</span> Ready in 1.8s
        </p>
      </div>
    </div>
  );
}
