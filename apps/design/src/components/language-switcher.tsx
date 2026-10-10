"use client";
// @primitive-exempt: the trigger is a breadcrumb scope (palette glyph, name, chevron), not an action button.

/**
 * The site's one design-language control, as a scope in the header breadcrumb.
 *
 * It was a boxed field at the top of the sidebar — border, a two-line label over
 * the value, an up/down chevron and a square swatch — and it read as a form
 * input rather than the thing the whole site is about. Vercel's dashboard names
 * the team and project it is showing the same way this names the language:
 * "Nebutra / Design / Factory ⌄", inline, no box, the scope the page is in.
 * Linear's workspace switcher is the same shape. A tint on hover marks it as
 * the one interactive crumb; the menu it opens is the design system's
 * DropdownMenu with a radio item per language.
 *
 * The glyph is the language's real palette — canvas, ink, action — as the
 * gallery cards show it, in the site's current mode. State is the shared hook
 * from @nebutra/theme: the document attribute and the session key the
 * marketing site also reads, applied before paint by the boot script.
 */

import { ChevronDown } from "@nebutra/icons";
import { LANGUAGES, useDesignLanguage } from "@nebutra/theme/language-switcher";
import { useTheme } from "@nebutra/tokens";
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
import { type Mode, PaletteDots } from "@/components/language-gallery";
import { useMounted } from "@/lib/use-mounted";

/** The site's mode once the stored theme is known; light until then. */
function useSiteMode(): Mode {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  return mounted && resolvedTheme === "dark" ? "dark" : "light";
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
  /** Only one mounted copy should own the keyboard shortcut. */
  shortcut?: boolean;
  className?: string;
}

export function LanguageSwitcher({ shortcut = false, className }: LanguageSwitcherProps) {
  const { active, select } = useDesignLanguage();
  const mode = useSiteMode();
  const [open, setOpen] = React.useState(false);
  const current = LANGUAGES.find((language) => language.id === active) ?? LANGUAGES[0];

  const toggle = React.useCallback(() => setOpen((value) => !value), []);
  useShortcut(shortcut ? toggle : noop);

  if (!current) return null;

  // The design system's menu, not a hand-rolled one: it brings the roving
  // focus, typeahead and portal the old hand-written menu re-implemented.
  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Design language: ${current.name}`}
          className={cn(
            // A crumb, not a field: no border, no fill at rest, the tint on
            // hover and while open is the only thing that says "press me".
            "-mx-1.5 inline-flex h-8 min-w-0 items-center gap-2 rounded-[var(--radius-md)] px-1.5 text-left transition-colors duration-micro ease-out hover:bg-accent data-[state=open]:bg-accent",
            className,
          )}
          data-language-trigger
          type="button"
        >
          <PaletteDots id={current.id} mode={mode} />
          <span className="truncate font-medium text-foreground text-sm">{current.shortName}</span>
          <ChevronDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(20rem,calc(100vw-2rem))]" sideOffset={8}>
        <DropdownMenuLabel className="flex items-baseline justify-between gap-3">
          <span>Design language</span>
          {shortcut ? (
            <span className="hidden items-center gap-1.5 font-normal text-2xs text-muted-foreground md:inline-flex">
              Switch <Kbd small>L</Kbd>
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup onValueChange={(value) => select(String(value))} value={current.id}>
          {LANGUAGES.map((language) => (
            <DropdownMenuRadioItem className="gap-3 py-2" key={language.id} value={language.id}>
              <PaletteDots id={language.id} mode={mode} />
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
  const mode = useSiteMode();
  const current = LANGUAGES.find((language) => language.id === active) ?? LANGUAGES[0];
  if (!current) return null;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <PaletteDots id={current.id} mode={mode} />
      <span>
        <span className="font-medium text-foreground">{current.name}</span>
        {current.tagline ? (
          <span className="text-muted-foreground"> — {current.tagline}</span>
        ) : null}
      </span>
    </span>
  );
}
