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
 * Reusable card shell for the Velocity Engine section.
 * Supabase-inspired: icon-less, title + one-line description + embedded visual.
 * Column spanning is handled by the parent grid, not this component.
 */
export function VelocityCard({ title, description, time, children }: VelocityCardProps) {
  return (
    <div className="group relative flex h-full flex-col rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 md:p-8 transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
        {time && (
          <span className="font-mono text-xs font-bold text-primary tabular-nums">{time}</span>
        )}
      </div>

      {/* Description — supports bold/muted inline mixing */}
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

      {/* Embedded visual */}
      {children && <div className="mt-6 flex-1">{children}</div>}
    </div>
  );
}
