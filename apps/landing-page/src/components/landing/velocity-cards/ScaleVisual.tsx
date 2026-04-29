"use client";

import { GitBranch, Infinity as InfinityIcon, ShieldCheck, Zap } from "lucide-react";

/**
 * High-fidelity Scale indicators visual showing post-launch growth infrastructure.
 * Fully aligned with semantic CSS tokens.
 */
const METRICS = [
  {
    label: "Tenants",
    value: <InfinityIcon className="w-8 h-8" />,
    desc: "Isolations",
    icon: ShieldCheck,
  },
  { label: "API", value: "oRPC", desc: "Type-safe", icon: Zap },
  { label: "CI/CD", value: "15", desc: "Pipelines", icon: GitBranch },
];

export function ScaleVisual() {
  return (
    <div className="w-full max-w-[460px] grid grid-cols-3 gap-3">
      {METRICS.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.label}
            className="group flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-background/80 backdrop-blur-xl p-4 md:p-5 text-center shadow-lg hover:scale-105 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-500 overflow-hidden relative"
          >
            {/* Semantic Hover Glow */}
            <div className="absolute -inset-4 bg-primary/5 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none" />

            <div className="mb-3 p-2 rounded-xl border border-border/50 bg-muted/40 text-primary relative z-10 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors duration-300">
              <Icon className="w-4 h-4" />
            </div>

            <span className="text-xl md:text-2xl font-black text-foreground mb-1 relative z-10 tracking-tight flex items-center justify-center h-8">
              {m.value}
            </span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground relative z-10 group-hover:text-primary transition-colors duration-300">
              {m.label}
            </span>
            <span className="text-[9px] text-muted-foreground/70 font-medium mt-0.5 relative z-10">
              {m.desc}
            </span>
          </div>
        );
      })}
    </div>
  );
}
