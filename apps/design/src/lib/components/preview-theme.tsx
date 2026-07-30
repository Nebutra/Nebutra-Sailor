"use client";

/**
 * Light / dark / split control for a component page.
 *
 * How this works, and why it works this way:
 *
 * `@nebutra/tokens` declares light values on `:root` and dark values on `.dark`.
 * There is no `.light` class. That means a dark island nested inside a light
 * document is achievable (add `.dark` to a wrapper) but a light island nested
 * inside a dark document is not — nothing can restore `:root` values to a
 * descendant of `.dark`.
 *
 * So the three modes are built out of what the token architecture actually
 * supports:
 *   light — document light, one pane
 *   dark  — document dark, one pane
 *   split — document light, second pane wrapped in `.dark`
 *
 * The document class is set directly rather than through next-themes so the
 * control works regardless of what the app shell provides, and the original
 * class is restored on unmount so a page visit does not leave the site's theme
 * changed behind it.
 */

import { Moon, Sun } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import * as React from "react";

export type PreviewMode = "light" | "dark" | "split";

const MODES: { id: PreviewMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "split", label: "Split" },
];

function useDocumentTheme(mode: PreviewMode) {
  React.useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");

    root.classList.toggle("dark", mode === "dark");

    return () => {
      root.classList.toggle("dark", had);
    };
  }, [mode]);
}

export function PreviewTheme({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<PreviewMode>("light");
  useDocumentTheme(mode);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
          {MODES.map((entry) => (
            <button
              aria-pressed={mode === entry.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-xs transition-colors",
                mode === entry.id
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={entry.id}
              onClick={() => setMode(entry.id)}
              type="button"
            >
              {entry.id === "light" ? <Sun className="size-3" /> : null}
              {entry.id === "dark" ? <Moon className="size-3" /> : null}
              {entry.label}
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          {mode === "split"
            ? "Both themes at once. The right pane is a nested .dark island."
            : "The whole document switches, so overlays and portals switch with it."}
        </p>
      </div>

      {mode === "split" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Pane dark={false}>{children}</Pane>
          <Pane dark>{children}</Pane>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function Pane({ children, dark }: { children: React.ReactNode; dark: boolean }) {
  return (
    <div className={cn("rounded-xl bg-background p-1", dark && "dark")}>
      <div className="mb-1 px-3 pt-2 font-mono text-[11px] text-muted-foreground uppercase tracking-wide">
        {dark ? "dark" : "light"}
      </div>
      {children}
    </div>
  );
}
