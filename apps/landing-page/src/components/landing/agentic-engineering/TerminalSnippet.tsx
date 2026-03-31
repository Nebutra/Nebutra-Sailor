import type * as React from "react";

interface TerminalSnippetProps {
  children: React.ReactNode;
}

/**
 * A macOS-style terminal window used to display code snippets
 * inside the Agentic Engineering bento cards.
 */
export function TerminalSnippet({ children }: TerminalSnippetProps) {
  return (
    <div className="w-full mt-auto relative z-10 rounded-xl border border-border/50 dark:border-white/5 bg-muted/60 dark:bg-zinc-950/90 shadow-2xl overflow-hidden group-hover:border-border dark:group-hover:border-white/20 transition-colors">
      {/* MacOS Terminal header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50 dark:border-white/10 bg-muted/80 dark:bg-black/40">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 shadow-[0_2px_4px_rgba(239,68,68,0.3)]" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 shadow-[0_2px_4px_rgba(234,179,8,0.3)]" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80 shadow-[0_2px_4px_rgba(34,197,94,0.3)]" />
        <div className="ml-2 text-[9px] font-mono tracking-widest text-muted-foreground uppercase">
          bash — node — workspace
        </div>
      </div>
      {/* Syntax Box */}
      <div className="p-4">
        <code className="block font-mono text-[11px] sm:text-xs leading-[1.8] break-words">
          <span className="text-muted-foreground mr-2 select-none">$</span>
          {children}
        </code>
      </div>
    </div>
  );
}

TerminalSnippet.displayName = "TerminalSnippet";
