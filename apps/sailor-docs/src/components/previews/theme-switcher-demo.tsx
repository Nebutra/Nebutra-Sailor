"use client";

import { ThemeSwitcher, type ThemeSwitcherValue } from "@nebutra/ui/primitives";
import { useState } from "react";

export function ThemeSwitcherDemo() {
  const [theme, setTheme] = useState<ThemeSwitcherValue>("system");

  return (
    <div className="gap-8 p-8 flex min-h-[300px] w-full flex-col items-center justify-center rounded-xl border bg-card">
      <div className="space-y-2 text-center">
        <h3 className="font-medium text-lg">Theme Switcher</h3>
        <p className="text-sm text-muted-foreground">
          A compact, animated toggle for light/dark/system preferences.
        </p>
      </div>

      <div className="gap-4 flex flex-col items-center">
        <ThemeSwitcher value={theme} onChange={setTheme} />

        <div className="text-sm gap-2 flex items-center text-muted-foreground">
          Current state:{" "}
          <span className="px-2 py-1 rounded bg-muted font-mono text-foreground">{theme}</span>
        </div>
      </div>
    </div>
  );
}
