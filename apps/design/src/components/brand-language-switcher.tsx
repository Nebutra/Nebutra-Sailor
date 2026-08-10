"use client";

/**
 * Live design-language switcher for the design site.
 *
 * `html[data-brand]` + `@nebutra/theme/skins.css` is already the product
 * mechanism — this control is the missing UI that makes Meta-Token work
 * *visible*. Without it the site renders real components on real tokens
 * but there is no way to see what a Brand Package actually does.
 *
 * Factory clears data-brand (tokens SSOT). Every other id sets
 * `document.documentElement.dataset.brand`, which activates the matching
 * block in skins.css. Persistence is session-only so a docs visit cannot
 * permanently recolour a developer's browser.
 *
 * Two instances can be mounted at once — the hero control on the home page and
 * the compact one in the header. They share one piece of state, and that state
 * lives on the document element rather than in either component, so they
 * broadcast to each other instead of each keeping a private copy that goes
 * stale the moment the other one is clicked.
 */

import { cn } from "@nebutra/ui/utils";
import { usePathname } from "next/navigation";
import * as React from "react";

const STORAGE_KEY = "nebutra.design.brand";
const CHANGE_EVENT = "nebutra.design.brandchange";

/** Built-in languages that ship a skin under html[data-brand]. Order is
 * visual: factory first, then denser product languages, then marketing. */
export const LANGUAGES: { id: string; label: string; note: string }[] = [
  { id: "factory", label: "Factory", note: "the token source, unskinned" },
  { id: "linear", label: "Linear", note: "tight radii, low-contrast chrome" },
  { id: "vercel", label: "Vercel", note: "monochrome, hard edges, lit top edge" },
  { id: "raycast", label: "Raycast", note: "dark glass and a coloured halo" },
  { id: "stripe", label: "Stripe", note: "soft elevation, generous type" },
  { id: "notion", label: "Notion", note: "paper surfaces, muted ink" },
  { id: "vanta", label: "Vanta", note: "high-trust enterprise blues" },
  { id: "gsap", label: "GSAP", note: "saturated, fast easing" },
];

function readStored(): string {
  if (typeof window === "undefined") return "factory";
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v && LANGUAGES.some((l) => l.id === v)) return v;
  } catch {
    /* private mode */
  }
  return "factory";
}

/** How long the blanket transition stays armed. Matches --brand-morph-duration
 *  in globals.css, plus a frame so the last interpolation lands before it goes. */
const MORPH_MS = 460;

let morphTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Flip the language, with the change animated rather than cut.
 *
 * The attribute swap rewrites ~200 custom properties in one frame, and custom
 * properties do not interpolate — so the whole page used to change between two
 * frames and read as a reload. The properties that *read* those variables do
 * interpolate, so a blanket transition is armed just before the flip and
 * disarmed after: alive for the length of the change and no longer, because
 * leaving it on would put 400ms of lag on every hover in the component surfaces
 * this site exists to demonstrate.
 *
 * `requestAnimationFrame` before writing the attribute matters — set the class
 * and the attribute in the same frame and the browser has no previous computed
 * value to transition from, so it cuts anyway.
 */
function applyBrand(id: string, animate = true) {
  const root = document.documentElement;

  const write = () => {
    if (id === "factory") {
      delete root.dataset.brand;
    } else {
      root.dataset.brand = id;
    }
  };

  if (!animate) {
    write();
  } else {
    root.classList.add("brand-morphing");
    clearTimeout(morphTimer);
    requestAnimationFrame(() => {
      write();
      morphTimer = setTimeout(() => root.classList.remove("brand-morphing"), MORPH_MS);
    });
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode */
  }
}

/** Shared state for every mounted switcher. */
function useBrandLanguage(): [string, (id: string) => void, boolean] {
  const [active, setActive] = React.useState("factory");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const stored = readStored();
    // No animation on restore: there is no previous language to move away from,
    // and a page that fades into its own colours on load looks like a bug.
    applyBrand(stored, false);
    setActive(stored);
    setReady(true);

    const onChange = (event: Event) => setActive((event as CustomEvent<string>).detail);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const select = React.useCallback((id: string) => {
    applyBrand(id);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
  }, []);

  return [active, select, ready];
}

/**
 * The persistent control in the site header, for every page that is not the
 * home page. The home page mounts the full-size picker directly above the
 * surface it rewrites, and rendering both put two identical eight-button rows
 * within a screen of each other — the second one reads as a broken duplicate,
 * not as a convenience.
 */
export function BrandLanguageSwitcher({ className }: { className?: string }) {
  const [active, select, ready] = useBrandLanguage();
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <fieldset
      className={cn("m-0 flex flex-wrap items-center gap-1.5 border-0 p-0", className)}
      data-ready={ready ? "true" : "false"}
    >
      <legend className="mr-1 float-left w-auto font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
        Language
      </legend>
      {LANGUAGES.map((lang) => {
        const isActive = active === lang.id;
        return (
          <button
            aria-pressed={isActive}
            className={cn(
              "rounded-[var(--radius-sm,0.25rem)] px-2 py-1 font-medium text-[11px] transition-colors",
              isActive
                ? "bg-foreground text-background"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            key={lang.id}
            onClick={() => select(lang.id)}
            type="button"
          >
            {lang.label}
          </button>
        );
      })}
    </fieldset>
  );
}

/**
 * The home-page control, sized as what it actually is: the primary interaction
 * of the site rather than a filter above a list. It names the active language
 * and what that language changes, because eight labels on their own read as a
 * segmented control for the page instead of a switch that rewrites every
 * surface under it.
 */
export function BrandLanguagePicker({ className }: { className?: string }) {
  const [active, select, ready] = useBrandLanguage();
  const current = LANGUAGES.find((lang) => lang.id === active) ?? LANGUAGES[0];

  return (
    <div className={cn("flex flex-col gap-3", className)} data-ready={ready ? "true" : "false"}>
      <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
        <legend className="sr-only">Design language</legend>
        {LANGUAGES.map((lang) => {
          const isActive = active === lang.id;
          return (
            <button
              aria-pressed={isActive}
              className={cn(
                "rounded-panel px-3.5 py-2 font-medium text-[13px] transition-[background-color,color,box-shadow] duration-micro ease-out",
                isActive
                  ? "bg-foreground text-background shadow-ambient-sm"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              key={lang.id}
              onClick={() => select(lang.id)}
              type="button"
            >
              {lang.label}
            </button>
          );
        })}
      </fieldset>
      <p className="text-[13px] text-muted-foreground leading-relaxed">
        <span className="text-foreground">{current?.label}</span> — {current?.note}. Colour roles,
        radii, elevation, type and easing move together, not just the palette.
      </p>
    </div>
  );
}
