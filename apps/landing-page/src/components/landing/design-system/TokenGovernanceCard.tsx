import { GitBranch, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

export function TokenGovernanceCard() {
  const t = useTranslations("designSystem");

  return (
    <div className="relative flex h-full flex-col overflow-hidden p-6 md:p-8">
      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-foreground line-clamp-1">
          {t("card4Title")}
        </h3>
      </div>

      {/* CI Mockup */}
      <div className="relative z-10 mt-auto flex flex-col h-[180px] w-full rounded-xl border border-border/50 bg-zinc-950 p-4 shadow-xl font-mono text-xs overflow-hidden group">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
          <div className="flex items-center gap-2 text-zinc-300 bg-zinc-900 rounded-sm px-2 py-0.5">
            <GitBranch className="h-3 w-3 text-emerald-400" />
            <span className="font-medium text-[10px]">token-sync.yml</span>
          </div>
          <span className="text-zinc-500 bg-zinc-900/50 px-1.5 py-0.5 rounded text-[10px]">
            2m 14s
          </span>
        </div>

        <div className="flex flex-col gap-2 relative">
          {/* Timeline progressive line */}
          <div className="absolute left-[7px] top-2 bottom-4 w-px bg-zinc-800" />
          <div className="absolute left-[7px] top-2 h-16 w-px bg-emerald-500/50 transition-all duration-1000 group-hover:h-full z-0" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="h-4 w-4 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center bg-zinc-950">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <span className="text-emerald-400 group-hover:text-emerald-300 transition-colors">
              token parsing config
            </span>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="h-4 w-4 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center bg-zinc-950">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <span className="text-emerald-400 group-hover:text-emerald-300 transition-colors">
              generate css variables
            </span>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="h-4 w-4 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center bg-zinc-950">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            </div>
            <span className="text-zinc-300 font-medium">verify contrast (WCAG)</span>
            <span className="ml-auto text-zinc-600 animate-pulse hidden sm:inline-block">11s</span>
          </div>

          <div className="flex items-center gap-3 relative z-10 mt-1">
            <div className="h-4 w-4 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center transition-colors group-hover:border-zinc-500">
              <div className="h-1 w-1 rounded-full bg-zinc-700 group-hover:bg-zinc-500 transition-colors" />
            </div>
            <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
              publish to registry
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
