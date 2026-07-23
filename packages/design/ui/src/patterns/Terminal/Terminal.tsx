"use client";

import * as React from "react";
import { cn } from "../../utils/cn";

/* ─────────────────────────────────────────────────────────────────────────────
 * Terminal Compound Component
 *
 * A terminal/code window pattern with macOS-style controls.
 *
 * Usage:
 * <Terminal>
 *   <Terminal.Header title="bash" />
 *   <Terminal.Body>
 *     <Terminal.Line prompt="$">npm install @nebutra/ui</Terminal.Line>
 *     <Terminal.Line prompt="$">npm run dev</Terminal.Line>
 *   </Terminal.Body>
 * </Terminal>
 * ───────────────────────────────────────────────────────────────────────────── */

type TerminalVariant = "default" | "minimal" | "glass";

interface TerminalContextValue {
  variant: TerminalVariant;
}

const TerminalContext = React.createContext<TerminalContextValue | null>(null);

/* ─────────────────────────────────────────────────────────────────────────── */

const variantStyles: Record<TerminalVariant, string> = {
  default: "bg-muted border border-border",
  minimal: "bg-background border border-border",
  glass: "bg-muted backdrop-blur-md border border-border",
};

/* ─────────────────────────────────────────────────────────────────────────── */

export interface TerminalProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: TerminalVariant;
}

const TerminalRoot = React.forwardRef<HTMLDivElement, TerminalProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <TerminalContext.Provider value={{ variant }}>
        <div
          ref={ref}
          className={cn(
            "rounded-[var(--radius-xl)] overflow-hidden font-mono text-sm",
            variantStyles[variant],
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </TerminalContext.Provider>
    );
  },
);
TerminalRoot.displayName = "Terminal";

/* ─────────────────────────────────────────────────────────────────────────── */

export interface TerminalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  showControls?: boolean;
}

const TerminalHeader = React.forwardRef<HTMLDivElement, TerminalHeaderProps>(
  ({ className, title, showControls = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 px-4 py-3 border-b border-border bg-muted",
          className,
        )}
        {...props}
      >
        {showControls && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" aria-hidden />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" aria-hidden />
            <span className="w-3 h-3 rounded-full bg-green-500/80" aria-hidden />
          </div>
        )}
        {title && <span className="ml-2 text-xs text-muted-foreground">{title}</span>}
        {children}
      </div>
    );
  },
);
TerminalHeader.displayName = "Terminal.Header";

/* ─────────────────────────────────────────────────────────────────────────── */

export type TerminalBodyProps = React.HTMLAttributes<HTMLDivElement>;

const TerminalBody = React.forwardRef<HTMLDivElement, TerminalBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("p-4 space-y-1", className)} {...props}>
        {children}
      </div>
    );
  },
);
TerminalBody.displayName = "Terminal.Body";

/* ─────────────────────────────────────────────────────────────────────────── */

export interface TerminalLineProps extends React.HTMLAttributes<HTMLDivElement> {
  prompt?: string;
  output?: boolean;
  highlight?: boolean;
}

const TerminalLine = React.forwardRef<HTMLDivElement, TerminalLineProps>(
  ({ className, prompt = "$", output = false, highlight = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start gap-2",
          highlight && "bg-muted -mx-2 px-2 py-0.5 rounded",
          className,
        )}
        {...props}
      >
        {!output && <span className="text-emerald-400 shrink-0 select-none">{prompt}</span>}
        <span className={cn("flex-1", output ? "text-muted-foreground" : "text-muted-foreground")}>
          {children}
        </span>
      </div>
    );
  },
);
TerminalLine.displayName = "Terminal.Line";

/* ─────────────────────────────────────────────────────────────────────────── */

// Compound component assembly
export const Terminal = Object.assign(TerminalRoot, {
  Header: TerminalHeader,
  Body: TerminalBody,
  Line: TerminalLine,
});

// Named exports for direct imports
export { TerminalBody, TerminalHeader, TerminalLine, TerminalRoot };
