"use client";

/**
 * The control that switches design language, shared by every surface that has one.
 *
 * This was built inside the design site, where it was the whole point of the
 * page. When the marketing site wanted the same thing, the choice was to copy it
 * — a second list of eight languages, a second morph, a second storage key that
 * disagrees the moment either is edited — or to move it next to the mechanism.
 * `@nebutra/tokens` already ships the light/dark control; the language control
 * is its sibling and belongs here, beside skins.css and the catalog.
 *
 * Consumers import `@nebutra/theme/skins.css` and `@nebutra/theme/morph.css`,
 * then mount one of these. Nothing else is needed: the languages come from the
 * registry, the captions from the catalog, the typefaces from the map emitted
 * with the sheet.
 */

import * as React from "react";
import { type DesignLanguageEntry, LANGUAGE_REGISTRY } from "./languages";
import fontsByBrand from "./skin-fonts.generated.json";

const STORAGE_KEY = "nebutra.design.brand";
const CHANGE_EVENT = "nebutra.design.brandchange";

/** How long the fallback blanket transition stays armed. Matches
 *  --brand-morph-duration in morph.css, plus a frame so the last interpolation
 *  lands before it is removed. */
const MORPH_MS = 460;

/** How long a font may hold the switch. A proprietary family that will never
 *  resolve on this origin must not make the control look unresponsive; a
 *  dissolve of the fallback is a far better failure than one that does not run. */
const FONT_BUDGET_MS = 220;

let morphTimer: ReturnType<typeof setTimeout> | undefined;

const FONTS: Record<string, string[]> = fontsByBrand;

/** Catalog order, factory first — it is the way back. */
export const LANGUAGES: DesignLanguageEntry[] = [
  ...LANGUAGE_REGISTRY.languages.filter((l) => l.id === "factory"),
  ...LANGUAGE_REGISTRY.languages.filter((l) => l.id !== "factory"),
];

function readStored(): string {
  if (typeof window === "undefined") return "factory";
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (value && LANGUAGES.some((l) => l.id === value)) return value;
  } catch {
    /* private mode */
  }
  return "factory";
}

/**
 * Make the incoming typefaces resident before the snapshot is taken.
 *
 * Without this the dissolve photographs a fallback face and the real one swaps
 * in after the animation has finished — a jump landing on a settled page, which
 * is the one that actually reads as broken. `document.fonts.load` resolves
 * immediately for a face already resident, so the common path costs nothing.
 */
async function ensureFontsFor(id: string): Promise<void> {
  const families = FONTS[id];
  if (!families?.length || !document.fonts) return;
  await Promise.race([
    Promise.allSettled(
      families.flatMap((family) => [
        document.fonts.load(`400 1rem "${family}"`),
        document.fonts.load(`600 1rem "${family}"`),
      ]),
    ),
    new Promise((resolve) => setTimeout(resolve, FONT_BUDGET_MS)),
  ]);
}

function supportsViewTransition(): boolean {
  if (typeof document === "undefined") return false;
  if (typeof document.startViewTransition !== "function") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Flip the language, with the change animated rather than cut.
 *
 * The attribute swap rewrites some two hundred custom properties in one frame,
 * and custom properties do not interpolate — so the whole page used to change
 * between two frames and read as a reload. The properties that *read* those
 * variables do interpolate, so a blanket transition is armed just before the
 * flip and disarmed after: alive for the length of the change and no longer,
 * because leaving it on would put 400ms of lag on every hover afterwards.
 *
 * Where the browser has view transitions, they replace that entirely. A
 * cross-fade carries the discrete changes a property transition cannot — the
 * typeface, gradients with different stop counts, shadow stacks of different
 * lengths — because by then they are pixels rather than properties. Only one of
 * the two ever runs: both together animate the same change twice, and two clocks
 * beating against each other is its own kind of jitter.
 *
 * `requestAnimationFrame` before writing the attribute matters on the fallback
 * path — set the class and the attribute in the same frame and the browser has
 * no previous computed value to transition from, so it cuts anyway.
 */
export function applyLanguageAttribute(id: string, animate = true): void {
  const root = document.documentElement;

  const write = () => {
    if (id === "factory") delete root.dataset.brand;
    else root.dataset.brand = id;
  };

  if (!animate) {
    write();
  } else if (supportsViewTransition()) {
    void ensureFontsFor(id).then(() => {
      document.startViewTransition?.(() => {
        write();
      });
    });
  } else {
    void ensureFontsFor(id).then(() => {
      root.classList.add("brand-morphing");
      clearTimeout(morphTimer);
      requestAnimationFrame(() => {
        write();
        morphTimer = setTimeout(() => root.classList.remove("brand-morphing"), MORPH_MS);
      });
    });
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode */
  }
}

/**
 * Shared state for every mounted switcher.
 *
 * The state lives on the document element rather than in any one component, so
 * two mounted controls broadcast to each other instead of each keeping a private
 * copy that goes stale the moment the other is clicked.
 */
export function useDesignLanguage(): {
  active: string;
  select: (id: string) => void;
  ready: boolean;
} {
  const [active, setActive] = React.useState("factory");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const stored = readStored();
    // No animation on restore: there is no previous language to move away from,
    // and a page that fades into its own colours on load looks like a bug.
    applyLanguageAttribute(stored, false);
    setActive(stored);
    setReady(true);

    const onChange = (event: Event) => setActive((event as CustomEvent<string>).detail);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const select = React.useCallback((id: string) => {
    applyLanguageAttribute(id);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
  }, []);

  return { active, select, ready };
}

function join(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export interface DesignLanguageSwitcherProps {
  className?: string;
  /** `compact` for a header rail, `picker` for a primary on-page control. */
  variant?: "compact" | "picker";
  /** Shown under a `picker`: names the active language and what it changes. */
  caption?: boolean;
  /**
   * Visible "Design language" label. Off where the surrounding surface already
   * says it — on the marketing card the legend sat directly under a heading
   * reading the same thing. Still rendered for assistive tech either way.
   */
  showLegend?: boolean;
}

/**
 * Eight buttons and, optionally, a line saying what the current one does.
 *
 * Deliberately built from plain elements rather than the component library: this
 * ships inside the package that defines the languages, and a control that
 * re-skins itself mid-press is a distraction from the page it is re-skinning.
 */
export function DesignLanguageSwitcher({
  className,
  variant = "compact",
  caption = false,
  showLegend = true,
}: DesignLanguageSwitcherProps) {
  const { active, select, ready } = useDesignLanguage();
  const current = LANGUAGES.find((l) => l.id === active) ?? LANGUAGES[0];
  const isPicker = variant === "picker";

  return (
    <div className={join("flex flex-col gap-3", className)} data-ready={ready ? "true" : "false"}>
      <fieldset
        className={join(
          "m-0 flex flex-wrap items-center border-0 p-0",
          isPicker ? "gap-1.5" : "gap-1.5",
        )}
      >
        <legend
          className={
            isPicker || !showLegend
              ? "sr-only"
              : "mr-1 float-left w-auto font-mono text-[10px] text-muted-foreground uppercase tracking-wider"
          }
        >
          Design language
        </legend>
        {LANGUAGES.map((language) => {
          const isActive = active === language.id;
          return (
            <button
              aria-pressed={isActive}
              className={join(
                "transition-[background-color,color,box-shadow] duration-micro ease-out",
                isPicker
                  ? "rounded-panel px-3.5 py-2 font-medium text-[13px]"
                  : "rounded-[var(--radius-sm,0.25rem)] px-2 py-1 font-medium text-[11px]",
                isActive
                  ? join("bg-foreground text-background", isPicker && "shadow-ambient-sm")
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              key={language.id}
              onClick={() => select(language.id)}
              type="button"
            >
              {language.shortName}
            </button>
          );
        })}
      </fieldset>
      {caption && current && (
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          <span className="text-foreground">{current.name}</span>
          {current.tagline ? ` — ${current.tagline}.` : "."} Colour roles, radii, elevation, type
          and easing move together, not just the palette.
        </p>
      )}
    </div>
  );
}
