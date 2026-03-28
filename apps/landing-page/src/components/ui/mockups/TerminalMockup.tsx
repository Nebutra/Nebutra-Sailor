"use client";

import { HARNESS_CODE_LINES } from "@/lib/constants/landing-data";

/** Mini code snippet for Architecture Tests card */
export function TerminalMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-muted/30 dark:bg-zinc-950/60 backdrop-blur-md shadow-elevation-high dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/50 dark:bg-zinc-900/40">
        <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700/80" />
        <span className="ml-2 text-[10px] font-mono text-muted-foreground/60">arch.test.ts</span>
      </div>
      <div className="p-5 bg-[var(--brand-gradient,linear-gradient(to_bottom_right,rgba(0,0,0,0.02),rgba(0,0,0,0.05)))] dark:bg-[var(--brand-gradient,linear-gradient(to_bottom_right,rgba(24,24,27,0.5),rgba(10,10,10,0.9)))]">
        <pre className="font-mono text-[12px] sm:text-[13px] leading-relaxed">
          {HARNESS_CODE_LINES.map((line, i) => (
            <span
              key={i}
              className={`block ${
                line.type === "key"
                  ? "text-emerald-600 dark:text-emerald-400 font-medium"
                  : line.text.includes("test") || line.text.includes("fc.")
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-foreground/80 dark:text-zinc-300"
              }`}
            >
              {line.text}
            </span>
          ))}
        </pre>
      </div>
    </div>
  );
}
