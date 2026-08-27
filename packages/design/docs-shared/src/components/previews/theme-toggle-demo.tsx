"use client";

import { ThemeToggle, type ThemeToggleValue } from "@nebutra/ui/primitives";
import { useState } from "react";

export function ThemeToggleDemo() {
  const [theme, setTheme] = useState<ThemeToggleValue>("light");

  return (
    <div className="flex min-h-[220px] w-full flex-col items-center justify-center gap-5 rounded-[var(--radius-lg)] border bg-card p-8 text-card-foreground">
      <ThemeToggle value={theme} onChange={setTheme} />
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        Current state:
        <span className="rounded-[var(--radius-sm)] bg-muted px-2 py-1 font-mono text-foreground text-xs">
          {theme}
        </span>
      </div>
    </div>
  );
}
