import { AnimateIn } from "../AnimateIn";
import type { StatItem } from "./data";

interface StatsDashboardProps {
  stats: StatItem[];
  t: (key: string) => string;
}

/**
 * Console-style metrics dashboard header with 1px divided grid cells.
 */
export function StatsDashboard({ stats, t }: StatsDashboardProps) {
  return (
    <AnimateIn preset="fadeUp" inView className="mt-16 sm:mt-24 w-full">
      <div className="mx-auto w-full rounded-[2rem] border border-border/50 bg-background/50 backdrop-blur-2xl p-1.5 shadow-2xl relative overflow-hidden ring-1 ring-border/10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/60 bg-border/60 gap-px rounded-[1.75rem] overflow-hidden">
          {stats.map((stat) => (
            <div
              key={stat.valueKey}
              className="group relative flex flex-col items-center justify-center bg-background p-8 md:p-10 transition-colors hover:bg-muted/30"
            >
              <span className="text-5xl md:text-6xl font-black tracking-tighter text-foreground transition-transform duration-500 group-hover:scale-105">
                {t(stat.valueKey)}
              </span>
              <span className="mt-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground group-hover:text-foreground/80 transition-colors">
                {t(stat.labelKey)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AnimateIn>
  );
}

StatsDashboard.displayName = "StatsDashboard";
