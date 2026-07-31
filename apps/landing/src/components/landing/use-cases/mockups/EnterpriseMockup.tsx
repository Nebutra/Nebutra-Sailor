"use client";

import { ChevronRight } from "@nebutra/icons";
import { AnimateIn } from "../../AnimateIn";

const navLinks = ["Products", "Solutions", "Pricing", "Docs"];
const stats = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "50M+", label: "API calls / day" },
  { value: "200+", label: "Countries" },
];

export function EnterpriseMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <AnimateIn
        preset="fadeUp"
        className="w-full max-w-2xl h-[420px] bg-background border border-border rounded-[var(--radius-xl)] overflow-hidden shadow-sm flex flex-col"
      >
        {/* Nav */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-4 shrink-0">
          <div className="h-5 w-5 rounded bg-primary" />
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            {navLinks.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Sign in</span>
            <div className="h-6 px-3 rounded-[var(--radius-md)] bg-primary flex items-center">
              <span className="text-[10px] text-primary-foreground font-medium">Get Started</span>
            </div>
          </div>
        </div>
        {/* Hero */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-border">
          <div className="text-base font-bold text-foreground leading-tight">
            Build the future of
            <br />
            enterprise software
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 max-w-xs mx-auto">
            Scalable infrastructure for modern teams. Ship faster with confidence.
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[11px] font-medium px-4 py-1.5 rounded-[var(--radius-lg)]">
              Start Free <ChevronRight className="h-3 w-3" />
            </div>
            <div className="inline-flex items-center text-[11px] font-medium px-4 py-1.5 rounded-[var(--radius-lg)] border border-border text-foreground">
              Book Demo
            </div>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          {stats.map((s) => (
            <div key={s.label} className="py-4 text-center">
              <div className="text-sm font-bold font-mono text-foreground">{s.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        {/* Logo strip */}
        <div className="px-6 py-4 flex items-center justify-center gap-4 flex-1">
          <div className="text-[10px] text-muted-foreground shrink-0">Trusted by</div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 w-14 rounded bg-muted/60" />
          ))}
        </div>
      </AnimateIn>
    </div>
  );
}
