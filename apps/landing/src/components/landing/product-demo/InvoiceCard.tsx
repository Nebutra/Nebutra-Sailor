"use client";

import { useEffect, useState } from "react";
import { AnimateIn } from "../AnimateIn";

export function InvoiceCard() {
  const [status, setStatus] = useState<"pending" | "paid">("pending");

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus("paid");
    }, 4500); // synchronizes with the text log typing animation
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimateIn
      className="relative mx-auto w-full max-w-sm rounded-[var(--radius-card)] border border-border bg-background/90 p-5"
      delay={2.2}
      duration={0.8}
      from={{ rotateX: 10, transformPerspective: 800 }}
      preset="fadeUp"
    >
      {/* Top Section */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="font-sans text-sm font-bold text-foreground">Invoice INV-12X</h4>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">Acme Corporation</p>
        </div>
        <div className="text-right">
          <p
            className="font-sans text-2xl font-semibold text-foreground tabular-nums"
            style={{ letterSpacing: "var(--tracking-tight)" }}
          >
            $4,200<span className="text-muted-foreground/50">.00</span>
          </p>
          <p className="font-mono text-[10px] text-muted-foreground mt-1 tracking-widest uppercase">
            Due Dec 1, 2026
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-border/50 to-transparent my-4" />

      {/* Line Items */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-foreground/80">Enterprise Base Plan</span>
          <span className="text-foreground">$2,000.00</span>
        </div>
        <div className="flex justify-between text-xs font-medium">
          <span className="text-foreground/80">Compute Overage (640 vCPU h)</span>
          <span className="text-foreground">$2,200.00</span>
        </div>
      </div>

      {/* Status Pill */}
      <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Status</span>
        <div className="relative h-7 w-[100px] overflow-hidden rounded-full border border-border/50 bg-muted/50 p-1">
          <div
            className={`absolute inset-y-1 left-1 right-1 rounded-full flex items-center justify-center shadow-sm ${
              status === "paid"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-success"
                : "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400"
            }`}
          >
            <span
              className="flex animate-[fade-in-up_0.3s_ease-out_both] items-center gap-1.5 font-bold text-[10px] uppercase tracking-widest motion-reduce:animate-none"
              key={status}
            >
              {status === "paid" && (
                <svg
                  aria-hidden="true"
                  className="h-3 w-3"
                  fill="none"
                  focusable="false"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                >
                  {/* Drawn with a dash rather than framer's pathLength: the path
                      is 32 units long, so a dash that length offset out and
                      pulled back in is the same gesture in CSS. */}
                  <polyline
                    className="animate-draw-check motion-reduce:animate-none"
                    points="20 6 9 17 4 12"
                    style={{ strokeDasharray: 32 }}
                  />
                </svg>
              )}
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Decorative Glow if Paid */}
      {/* AnimatePresence with no exit prop was doing nothing on the way out.
          A glow that fades in when the status flips is one transition. */}
      <div
        aria-hidden="true"
        className={`-z-10 pointer-events-none absolute -inset-0.5 rounded-[var(--radius-2xl)] border-2 border-success/30 blur-[4px] transition-opacity ${
          status === "paid" ? "opacity-100" : "opacity-0"
        }`}
      />
    </AnimateIn>
  );
}
