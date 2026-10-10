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
 * Light and dark go through the site's ThemeProvider, so this control and the
 * header toggle are one preference; split pins the document light locally.
 */

import { Moon, Sun } from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import { cn } from "@nebutra/ui/utils";
import * as React from "react";
import { useMounted } from "@/lib/use-mounted";

export type PreviewMode = "light" | "dark" | "split";

const MODES: { id: PreviewMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "split", label: "Split" },
];

/**
 * Light and dark are the site's own theme now — the header toggle and this
 * control are the same preference, so a component page no longer forces light
 * on arrival or leaves the theme changed behind it. Split is the one local
 * mode: it pins the document light while it is on (so the left pane is light)
 * and hands the document back to the site theme when it is turned off or the
 * page is left.
 */
function useSplitPin(split: boolean, resolved: "light" | "dark") {
  React.useEffect(() => {
    if (!split) return;
    const root = document.documentElement;
    root.classList.remove("dark");
    return () => {
      root.classList.toggle("dark", resolved === "dark");
    };
  }, [split, resolved]);
}

export function PreviewTheme({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [split, setSplit] = React.useState(false);
  const mounted = useMounted();
  const mode: PreviewMode | null = split ? "split" : mounted ? resolvedTheme : null;
  useSplitPin(split, resolvedTheme);

  function setMode(next: PreviewMode) {
    if (next === "split") {
      setSplit(true);
      return;
    }
    setSplit(false);
    setTheme(next);
  }

  return (
    <div className="flex flex-col">
      {/* Sticky under the header, so the theme a specimen is shown in can be
          changed from wherever the reader has scrolled to. */}
      <div className="-mx-4 sticky top-16 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-border border-t bg-background/85 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8 lg:-mx-12 lg:px-12">
        <fieldset className="m-0 flex min-w-0 items-center gap-0.5 rounded-[var(--radius-md)] border border-border bg-card p-0.5">
          <legend className="sr-only">Preview theme</legend>
          {MODES.map((entry) => (
            <button
              aria-pressed={mode === entry.id}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 font-medium text-xs transition-colors duration-micro",
                mode === entry.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={entry.id}
              onClick={() => setMode(entry.id)}
              type="button"
            >
              {entry.id === "light" ? <Sun aria-hidden className="size-3.5" /> : null}
              {entry.id === "dark" ? <Moon aria-hidden className="size-3.5" /> : null}
              {entry.label}
            </button>
          ))}
        </fieldset>
        <p className="m-0 text-muted-foreground text-xs">
          {mode === "split"
            ? "Both themes at once. The right pane is a nested .dark island."
            : "The whole document switches, so overlays and portals switch with it."}
        </p>
      </div>

      {mode === "split" ? (
        <div className="grid gap-4 py-12 lg:grid-cols-2">
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
    /* The pane insets its content, not just its own label. It carried p-1 with
       px-3 on the label alone, so every heading and specimen inside sat flush
       against the pane edge — most visibly on the dark island, where the text
       ran straight into the boundary. A container that pads its chrome and not
       what it contains is the bug; matching the two is the fix. */
    <div
      className={cn(
        // States are full-bleed bands in the article; inside a pane they sit flush.
        "rounded-lg border border-border bg-background p-4 [&_section]:mx-0 [&_section]:px-0",
        dark && "dark",
      )}
    >
      <div className="mb-3 font-medium text-foreground text-sm">{dark ? "Dark" : "Light"}</div>
      {children}
    </div>
  );
}
