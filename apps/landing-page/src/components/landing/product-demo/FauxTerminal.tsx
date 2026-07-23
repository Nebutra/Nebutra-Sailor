export function FauxTerminal({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full rounded-[2rem] overflow-hidden border border-border/60 bg-background/80 dark:bg-zinc-950/80 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_40px_80px_rgba(0,0,0,0.3)] ring-1 ring-black/5 flex flex-col transition-[background-color,border-color,box-shadow] duration-700">
      {/* macOS Control Header */}
      <div className="flex flex-none items-center px-5 h-14 border-b border-border/60 bg-muted/40/[0.02]">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-border/80 dark:bg-zinc-700/80 shadow-sm border border-black/5 hover:bg-red-400 transition-colors"></div>
          <div className="w-3 h-3 rounded-full bg-border/80 dark:bg-zinc-700/80 shadow-sm border border-black/5 hover:bg-amber-400 transition-colors"></div>
          <div className="w-3 h-3 rounded-full bg-border/80 dark:bg-zinc-700/80 shadow-sm border border-black/5 hover:bg-emerald-400 transition-colors"></div>
        </div>
        <div className="ml-6 flex-1 text-center pr-12">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-[var(--radius-md)] bg-background dark:bg-zinc-900 border border-border/40 shadow-sm">
            <span className="text-[10px] font-mono font-bold text-muted-foreground tracking-widest">
              operator@nebutra-sailor: ~
            </span>
          </div>
        </div>
      </div>

      {/* Terminal Content Area (Theme Adaptive) */}
      <div className="flex-1 p-6 sm:p-8 overflow-y-auto w-full bg-gradient-to-br from-background/40 via-background/20 to-muted/20 dark:from-zinc-950 dark:to-muted relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:14px_24px] opacity-50 pointer-events-none" />
        <div className="relative z-10 w-full h-full">{children}</div>
      </div>
    </div>
  );
}
