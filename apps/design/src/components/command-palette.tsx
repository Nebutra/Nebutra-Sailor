"use client";

/**
 * ⌘K over everything the site can reach.
 *
 * The sidebar became the right answer at forty entries and the wrong one at two
 * hundred: it shows you the whole system, which is the point, but finding one
 * named thing in it now means scanning a column that is taller than the screen.
 * Search is the other half of that — the sidebar is for orientation, this is for
 * arrival.
 *
 * The index is the navigation tree plus the showcase, handed in from the server.
 * Nothing is listed here that is not already reachable, and nothing reachable is
 * missing, because both come from the same call the sidebar renders.
 */

import { MagnifyingGlass } from "@nebutra/icons";
import { Kbd } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useRouter } from "next/navigation";
import * as React from "react";
import { createPortal } from "react-dom";
import { type CommandEntry, rank } from "@/lib/command-rank";

export type { CommandEntry };

const MAX_RESULTS = 12;

export function CommandPalette({ entries }: { entries: CommandEntry[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const results = React.useMemo(() => {
    if (!query.trim()) return entries.slice(0, MAX_RESULTS);
    return entries
      .map((entry) => ({ entry, rank: rank(entry, query.trim()) }))
      .filter((row) => row.rank >= 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, MAX_RESULTS)
      .map((row) => row.entry);
  }, [entries, query]);

  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // The input mounts with the dialog, so focus has to wait a frame.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function go(entry: CommandEntry | undefined) {
    if (!entry) return;
    setOpen(false);
    if (!entry.external) router.push(entry.href);
    else if (/^https?:\/\//.test(entry.href)) window.open(entry.href, "_blank", "noopener");
    else window.location.assign(entry.href);
  }

  return (
    <>
      <button
        aria-keyshortcuts="Meta+K Control+K"
        aria-label="Search the design system"
        className="flex h-9 items-center gap-2 rounded-[min(var(--radius-lg),0.5rem)] text-muted-foreground transition-[background-color,border-color,color] duration-micro ease-out hover:text-foreground max-lg:w-8 max-lg:justify-center max-lg:hover:bg-muted lg:w-full lg:border lg:border-transparent lg:bg-muted/50 lg:pe-1.5 lg:ps-2.5 lg:hover:border-hairline/30 lg:hover:bg-card"
        onClick={() => setOpen(true)}
        type="button"
      >
        <MagnifyingGlass aria-hidden className="size-4 shrink-0" />
        <span className="hidden min-w-0 flex-1 truncate whitespace-nowrap text-start text-ui lg:inline">
          Search documentation…
        </span>
        <Kbd
          className="hidden shrink-0 border-hairline/20 bg-background/70 text-2xs lg:inline-flex"
          meta
          small
        >
          K
        </Kbd>
      </button>

      {/* Portalled to <body>: the header carries backdrop-filter, which makes it
          the containing block for fixed descendants, so an inline scrim only
          covered the header's own 64px. */}
      {open && typeof document !== "undefined"
        ? createPortal(
            // biome-ignore lint/a11y/useKeyWithClickEvents: the backdrop is a dismiss affordance; Escape is handled globally above.
            <div
              /* A fixed wash, not a themed one. The foreground-tinted overlay is correct in
             light mode — near-black over a light page — and inverts in a dark
             skin, where --foreground is near-white and the scrim became a 20%
             white veil laid over dark content. That is the haze: measured at
             oklab(0.999994 … / 0.2) under Raycast. A scrim is shadow rather
             than surface; it darkens in both modes or it is not a scrim. */
              className="fixed inset-0 z-50 flex items-start justify-center bg-[oklch(0_0_0/0.45)] p-4 pt-[12vh] backdrop-blur-sm"
              onClick={(event) => {
                if (event.target === event.currentTarget) setOpen(false);
              }}
            >
              <div
                aria-label="Search the design system"
                aria-modal="true"
                className="w-full max-w-xl overflow-hidden rounded-[var(--radius-lg)] bg-popover shadow-ambient-lg ring-1 ring-hairline"
                role="dialog"
              >
                <input
                  className="w-full border-hairline border-b bg-transparent px-4 py-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground"
                  data-allow-native
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(0);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setActive((value) => Math.min(value + 1, results.length - 1));
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setActive((value) => Math.max(value - 1, 0));
                    }
                    if (event.key === "Enter") {
                      event.preventDefault();
                      go(results[active]);
                    }
                  }}
                  placeholder="Search tokens, components, patterns…"
                  ref={inputRef}
                  value={query}
                />

                <div className="max-h-[52vh] overflow-y-auto p-1.5">
                  {results.length === 0 ? (
                    <p className="px-3 py-6 text-center text-ui text-muted-foreground">
                      Nothing matches “{query}”.
                    </p>
                  ) : (
                    results.map((entry, index) => (
                      <button
                        className={cn(
                          "flex w-full items-baseline justify-between gap-4 rounded-[var(--radius-md)] px-3 py-2 text-start transition-colors",
                          index === active ? "bg-muted text-foreground" : "text-muted-foreground",
                        )}
                        key={`${entry.group}/${entry.label}`}
                        onClick={() => go(entry)}
                        onMouseEnter={() => setActive(index)}
                        type="button"
                      >
                        <span className="text-sm">{entry.label}</span>
                        <span className="shrink-0 text-muted-foreground text-xs">
                          {entry.group}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
