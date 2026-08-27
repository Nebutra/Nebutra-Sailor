import { GitBranch, ShieldCheck } from "@nebutra/icons";
import { useTranslations } from "next-intl";

export function TokenGovernanceCard() {
  const t = useTranslations("designSystem");

  return (
    <div className="relative flex h-full flex-col overflow-hidden p-6 md:p-8">
      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-foreground line-clamp-1">
          {t("card4Title")}
        </h3>
      </div>

      {/* CI Mockup */}
      <div className="relative z-10 mt-auto flex flex-col h-[180px] w-full rounded-[var(--radius-xl)] border border-border/60 bg-background p-4 shadow-sm font-mono text-xs overflow-hidden group">
        <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
          <div className="flex items-center gap-2 text-foreground font-semibold bg-muted px-2 py-0.5 rounded-[var(--radius-md)] border border-border/50">
            <GitBranch className="h-3 w-3 text-success" />
            <span className="font-bold text-[10px]">token-sync.yml</span>
          </div>
          <span className="text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded text-[10px] font-medium border border-border/40">
            2m 14s
          </span>
        </div>

        <div className="flex flex-col gap-2 relative">
          {/* Timeline progressive line */}
          <div className="absolute left-[7px] top-2 bottom-4 w-px bg-border group-hover:bg-border/40 transition-colors" />
          <div className="absolute left-[7px] top-2 h-16 w-px bg-emerald-500/60 dark:bg-emerald-500/80 transition-[height] duration-1000 group-hover:h-full motion-reduce:transition-none z-0" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center bg-background">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <span className="text-foreground font-medium group-hover:text-success transition-colors">
              token parsing config
            </span>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center bg-background">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <span className="text-foreground font-medium group-hover:text-success transition-colors">
              generate css variables
            </span>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="h-4 w-4 rounded-full bg-blue-500/10 border border-blue-500/40 flex items-center justify-center bg-background">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
            </div>
            <span className="text-foreground font-semibold">verify contrast (WCAG)</span>
            <span className="ml-auto text-muted-foreground font-bold animate-pulse hidden sm:inline-block border border-border/50 bg-muted/30 px-1.5 rounded-[var(--radius-sm)]">
              11s
            </span>
          </div>

          <div className="flex items-center gap-3 relative z-10 mt-1">
            <div className="h-4 w-4 rounded-full border border-border bg-muted/50 flex items-center justify-center transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
              <div className="h-1 w-1 rounded-full bg-muted-foreground/50 group-hover:bg-primary/60 transition-colors" />
            </div>
            <span className="text-muted-foreground font-medium group-hover:text-foreground transition-colors">
              publish to registry
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
