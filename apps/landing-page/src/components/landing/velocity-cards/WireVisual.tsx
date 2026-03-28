"use client";

import { CheckCircle2, ChevronRight } from "lucide-react";

/**
 * High-fidelity Config checklist visual showing the wiring phase.
 * Fully aligned with semantic tokens.
 */
const ITEMS = [
  { label: "Prisma + Supabase", desc: "Global edge database", done: true },
  { label: "Clerk Authentication", desc: "B2B Single Sign-On", done: true },
  { label: "Stripe Billing", desc: "Usage-based & Subscriptions", done: true },
  { label: "AI Gateway Component", desc: "OpenRouter & Vercel AI", done: true },
];

export function WireVisual() {
  return (
    <div className="w-full max-w-[380px] rounded-2xl border border-border/80 bg-background/90 backdrop-blur-xl shadow-2xl shadow-primary/5 p-6 relative overflow-hidden">
      {/* Decorative top border using primary token */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-primary/50 to-primary opacity-80" />

      <div className="mb-4 flex items-center justify-between pb-4 border-b border-border/50">
        <h4 className="font-semibold text-foreground tracking-tight text-sm">
          Automated CLI Config
        </h4>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Live
        </div>
      </div>

      <div className="space-y-4">
        {ITEMS.map((item) => (
          <div key={item.label} className="flex items-start gap-4 group">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground tracking-tight">
                  {item.label}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-xs text-muted-foreground font-medium block mt-0.5">
                {item.desc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
