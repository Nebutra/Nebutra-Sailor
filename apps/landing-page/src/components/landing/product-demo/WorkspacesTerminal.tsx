import { AnimatedSpan, TypingAnimation } from "@nebutra/ui/primitives";

export function WorkspacesTerminal() {
  return (
    <div
      key="workspaces-term"
      className="font-mono text-xs md:text-sm leading-relaxed flex flex-col gap-2 h-full"
    >
      <TypingAnimation delay={100} className="text-muted-foreground/80 dark:text-zinc-400">
        &gt; nebutra workspace generate "Acme Corp"
      </TypingAnimation>
      <AnimatedSpan delay={1000} className="text-purple-600 dark:text-purple-400 mt-2">
        Allocating isolated database schema [schema_id: acme_992]...
      </AnimatedSpan>

      <AnimatedSpan delay={1800}>
        <div className="mt-4 mb-2 relative rounded-lg border border-border/50 dark:border-white/5 bg-background/50 overflow-hidden shadow-sm">
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,var(--primary)_360deg)] animate-[spin_3s_linear_infinite] opacity-10" />
          <div className="absolute inset-[1px] bg-background/95 dark:bg-zinc-950/95 backdrop-blur-xl rounded-lg z-10" />
          <div className="relative z-20 p-4 font-mono text-xs flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-muted-foreground border-b border-border/50 dark:border-white/5 pb-2">
              <span>Postgres RLS policy enforced:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 pl-1.5 py-0.5 rounded flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ACTIVE
              </span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Vercel wildcard edge routing:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 pl-1.5 py-0.5 rounded flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ATTACHED
              </span>
            </div>
          </div>
        </div>
      </AnimatedSpan>

      <AnimatedSpan delay={2800} className="text-cyan-600 dark:text-cyan-400 mt-2">
        Sending invite to admin@acme.com...
      </AnimatedSpan>
      <AnimatedSpan delay={3500} className="text-foreground font-bold mt-2 flex items-center gap-2">
        ✨ Workspace fully initialized in 4.2s.
      </AnimatedSpan>
    </div>
  );
}
