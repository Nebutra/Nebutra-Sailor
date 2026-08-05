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

import { cn } from "@nebutra/ui/utils";
import { useRouter } from "next/navigation";
import * as React from "react";

export interface CommandEntry {
  href: string;
  label: string;
  /** Section it belongs to, shown as context on the row. */
  group: string;
}

/**
 * Subsequence match, ranked.
 *
 * A plain `includes` fails "ipmock" → "iPhone Mockup", which is exactly how
 * people type into a palette. Subsequence matching handles that; the score then
 * favours a prefix hit and a tight run of characters, so "table" puts Table
 * above Turntable and above anything that merely contains the letters.
 */
function score(label: string, query: string): number {
  const haystack = label.toLowerCase();
  const needle = query.toLowerCase();
  if (!needle) return 0;

  let at = -1;
  let first = -1;
  let last = -1;
  for (const char of needle) {
    at = haystack.indexOf(char, at + 1);
    if (at === -1) return -1;
    if (first === -1) first = at;
    last = at;
  }

  const spread = last - first + 1;
  const tightness = needle.length / spread;
  const early = 1 - first / Math.max(haystack.length, 1);
  const exact = haystack.startsWith(needle) ? 1 : 0;
  return exact * 2 + tightness + early;
}

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
      .map((entry) => ({ entry, rank: score(entry.label, query.trim()) }))
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
    router.push(entry.href);
  }

  return (
    <>
      <button
        aria-keyshortcuts="Meta+K Control+K"
        className="flex items-center gap-2 rounded-[var(--radius-md)] bg-muted/60 px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={() => setOpen(true)}
        type="button"
      >
        Search
        <kbd className="rounded-[var(--radius-sm)] bg-background px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      {open ? (
        // biome-ignore lint/a11y/useKeyWithClickEvents: the backdrop is a dismiss affordance; Escape is handled globally above.
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/20 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            aria-label="Search the design system"
            aria-modal="true"
            className="w-full max-w-xl overflow-hidden rounded-[var(--radius-lg)] bg-background shadow-ambient-lg"
            role="dialog"
          >
            <input
              className="w-full bg-transparent px-4 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
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

            <div className="max-h-[52vh] overflow-y-auto bg-muted/40 p-1.5">
              {results.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                  Nothing matches “{query}”.
                </p>
              ) : (
                results.map((entry, index) => (
                  <button
                    className={cn(
                      "flex w-full items-baseline justify-between gap-4 rounded-[var(--radius-md)] px-3 py-2 text-left transition-colors",
                      index === active ? "bg-card text-foreground" : "text-muted-foreground",
                    )}
                    key={entry.href}
                    onClick={() => go(entry)}
                    onMouseEnter={() => setActive(index)}
                    type="button"
                  >
                    <span className="text-[14px]">{entry.label}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground uppercase tracking-wide">
                      {entry.group}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
