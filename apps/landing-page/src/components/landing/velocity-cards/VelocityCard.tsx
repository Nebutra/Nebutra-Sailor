"use client";

import type { ReactNode } from "react";

interface VelocityCardProps {
  title: string;
  /** Description with optional bold segments via React nodes */
  description: ReactNode;
  /** Time badge (e.g., "2 min") */
  time?: string;
  /** Visual content embedded in the card */
  children?: ReactNode;
}

/**
 * Premium split-card shell for the Velocity Engine section.
 * Contains text on the top, and places the visual inside a subtle bounding box at the bottom.
 */
export function VelocityCard({ title, description, time, children }: VelocityCardProps) {
  return (
    <div className="group relative flex h-[460px] md:h-[500px] flex-col rounded-3xl border border-border/60 bg-background shadow-sm hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-500 overflow-hidden">
      {/* Subtle top gradient glow on hover */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -top-24 -inset-x-24 h-48 bg-primary/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Top Text Content Area */}
      <div className="p-8 md:p-10 pb-6 relative z-10 shrink-0">
        <div className="flex items-start justify-between mb-4 gap-4">
          <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight leading-tight">
            {title}
          </h3>
          {time && (
            <span className="shrink-0 inline-flex items-center px-3 py-1 rounded-full font-mono text-[11px] font-bold text-primary bg-primary/10 tabular-nums uppercase tracking-widest">
              {time}
            </span>
          )}
        </div>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
          {description}
        </p>
      </div>

      {/* Embedded Visual Area - Fills remaining space with a subtle background */}
      <div className="flex-1 w-full bg-muted/40 dark:bg-white/[0.02] border-t border-border/50 flex flex-col items-center justify-center relative overflow-hidden p-6 md:p-8">
        {/* Decorative subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)] opacity-20 pointer-events-none" />

        <div className="relative z-10 w-full flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-700 ease-out">
          {children}
        </div>
      </div>
    </div>
  );
}
