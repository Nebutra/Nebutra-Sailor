"use client";
// @primitive-exempt: the language tiles are swatches painted in each language's own colours, not action buttons.

/**
 * The site's one design-language control.
 *
 * It used to be nine pill buttons, mounted twice: a full-size row on the home
 * page and a cramped copy in the header of every other page. Nine equal-weight
 * buttons say "pick one of these labels"; they do not say what a language *is*.
 * This is a single trigger that names the active language beside its swatch and
 * opens a list where every language shows its canvas and its action colour, its
 * name and the one line that says what it does — the comparison the site exists
 * to make, made before you click.
 *
 * State is the shared hook from @nebutra/theme: the document attribute and the
 * session key the marketing site also reads. Mounting this twice (sidebar on
 * desktop, the page bar on narrow screens) keeps both in step because the hook
 * broadcasts, not because each copy is told.
 *
 * Swatches are read from each language's Brand Package roles, and Factory's
 * from the token values, at their default mode. Nothing here is typed in.
 */

import { ChevronUpDown } from "@nebutra/icons";
import { getBuiltInBrandPackage } from "@nebutra/theme";
import { LANGUAGES, useDesignLanguage } from "@nebutra/theme/language-switcher";
import { tokenColor } from "@nebutra/tokens/values";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Kbd,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import * as React from "react";

interface Swatch {
  canvas: string;
  ink: string;
  action: string;
}

function hsl(channels: string | undefined, fallback: string): string {
  return channels ? `hsl(${channels})` : fallback;
}

function swatchFor(id: string, darkDefault: boolean): Swatch {
  if (id === "factory") {
    const mode = darkDefault ? "dark" : "light";
    return {
      canvas: tokenColor("--background", mode),
      ink: tokenColor("--foreground", mode),
      action: tokenColor("--primary", mode),
    };
  }
  const roles = getBuiltInBrandPackage(id)?.roles;
  return {
    canvas: hsl(roles?.canvas, "hsl(var(--background))"),
    ink: hsl(roles?.canvasForeground, "hsl(var(--foreground))"),
    action: hsl(roles?.action, "hsl(var(--primary))"),
  };
}

const SWATCHES: Record<string, Swatch> = Object.fromEntries(
  LANGUAGES.map((language) => [language.id, swatchFor(language.id, language.darkDefault)]),
);

/**
 * A language at thumbnail size: its canvas, a line of its ink, its action fill.
 * The three things that change first when you switch, in the proportions they
 * occupy on a real screen.
 */
export function LanguageSwatch({ id, className }: { id: string; className?: string }) {
  const swatch = SWATCHES[id] ?? SWATCHES.factory;
  if (!swatch) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-5 shrink-0 items-end gap-[2px] overflow-hidden rounded-[var(--radius-sm)] p-[3px] ring-1 ring-border ring-inset",
        className,
      )}
      style={{ background: swatch.canvas }}
    >
      <span className="h-[3px] flex-1 rounded-full" style={{ background: swatch.ink }} />
      <span className="size-[7px] shrink-0 rounded-full" style={{ background: swatch.action }} />
    </span>
  );
}

/** Opening shortcut: `L`, ignored while typing. */
function useShortcut(onTrigger: () => void) {
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "l" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      onTrigger();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onTrigger]);
}

export interface LanguageSwitcherProps {
  /** `sidebar` spans its rail and shows the tagline; `bar` is the narrow-screen chip. */
  variant?: "sidebar" | "bar";
  /** Only one mounted copy should own the keyboard shortcut. */
  shortcut?: boolean;
  className?: string;
}

export function LanguageSwitcher({
  variant = "sidebar",
  shortcut = false,
  className,
}: LanguageSwitcherProps) {
  const { active, select } = useDesignLanguage();
  const [open, setOpen] = React.useState(false);
  const current = LANGUAGES.find((language) => language.id === active) ?? LANGUAGES[0];

  const toggle = React.useCallback(() => setOpen((value) => !value), []);
  useShortcut(shortcut ? toggle : noop);

  if (!current) return null;
  const isSidebar = variant === "sidebar";

  // The design system's menu, not a hand-rolled one: it brings the roving
  // focus, typeahead and portal the old hand-written menu re-implemented.
  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Design language: ${current.name}`}
          className={cn(
            "group flex items-center gap-2.5 text-left transition-[background-color,border-color] duration-micro ease-out",
            isSidebar
              ? "w-full rounded-[var(--radius-md)] border border-border bg-card px-2.5 py-2 hover:bg-accent"
              : "h-8 rounded-[var(--radius-md)] border border-border bg-card px-2 hover:bg-accent",
            className,
          )}
          data-language-trigger
          type="button"
        >
          <LanguageSwatch id={current.id} />
          <span className="flex min-w-0 flex-1 flex-col">
            {isSidebar ? (
              <span className="text-2xs text-muted-foreground">Design language</span>
            ) : null}
            <span className="truncate font-medium text-foreground text-ui">
              {current.shortName}
            </span>
          </span>
          <ChevronUpDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(22rem,calc(100vw-2rem))]" sideOffset={6}>
        <DropdownMenuLabel className="flex items-baseline justify-between gap-3">
          <span>Design language</span>
          <span className="font-normal text-2xs text-muted-foreground">
            Re-skins this site
            {shortcut ? (
              <>
                {" · "}
                <Kbd small>L</Kbd>
              </>
            ) : null}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup onValueChange={(value) => select(String(value))} value={current.id}>
          {LANGUAGES.map((language) => (
            <DropdownMenuRadioItem className="gap-3 py-2" key={language.id} value={language.id}>
              <LanguageSwatch className="size-7 p-1" id={language.id} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium text-foreground text-ui">{language.name}</span>
                {language.tagline ? (
                  <span className="truncate text-muted-foreground text-xs">{language.tagline}</span>
                ) : null}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function noop() {}

/** The active language's name and tagline, for prose that refers to it. */
export function ActiveLanguageCaption({ className }: { className?: string }) {
  const { active } = useDesignLanguage();
  const current = LANGUAGES.find((language) => language.id === active) ?? LANGUAGES[0];
  if (!current) return null;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LanguageSwatch id={current.id} />
      <span>
        <span className="font-medium text-foreground">{current.name}</span>
        {current.tagline ? (
          <span className="text-muted-foreground"> — {current.tagline}</span>
        ) : null}
      </span>
    </span>
  );
}

/**
 * The home page's switch: every language as a tile you can press, painted in
 * its own canvas, ink and action fill. Pressing one re-skins the whole site —
 * the grid under it is the same live components, so the strip and what it
 * changes are on one screen.
 */
export function LanguageStrip({ className }: { className?: string }) {
  const { active, select } = useDesignLanguage();
  return (
    <div className={cn("grid grid-cols-5 gap-1.5 sm:gap-2 md:grid-cols-9", className)}>
      {LANGUAGES.map((language) => {
        const swatch = SWATCHES[language.id] ?? SWATCHES.factory;
        const checked = language.id === active;
        if (!swatch) return null;
        return (
          <button
            aria-label={`${language.name} design language`}
            aria-pressed={checked}
            className={cn(
              "group/tile flex flex-col gap-2 rounded-lg p-1 text-left transition-colors duration-micro",
              checked ? "bg-accent" : "hover:bg-accent",
            )}
            key={language.id}
            onClick={() => select(language.id)}
            type="button"
          >
            <span
              aria-hidden
              className={cn(
                "flex aspect-[4/3] w-full flex-col justify-between rounded-[var(--radius-md)] p-2.5 ring-1 ring-inset",
                checked ? "ring-foreground" : "ring-border",
              )}
              style={{ background: swatch.canvas }}
            >
              <span className="font-medium text-lg leading-none" style={{ color: swatch.ink }}>
                Aa
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="h-1 flex-1 rounded-full opacity-30"
                  style={{ background: swatch.ink }}
                />
                <span className="h-3 w-5 rounded-full" style={{ background: swatch.action }} />
              </span>
            </span>
            <span className="truncate px-1 pb-0.5 text-foreground text-xs">
              {language.shortName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
