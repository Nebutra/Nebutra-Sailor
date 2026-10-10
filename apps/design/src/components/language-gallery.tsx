"use client";
// @primitive-exempt: each tile is a miniature screen painted in another language's tokens; Button would paint it in the active one.

/**
 * The home page's language picker, laid out the way ray.so lays out Raycast
 * themes: a card per theme that is a working miniature of the product in that
 * theme, with its name, one line and its palette under it.
 *
 * A miniature has to be drawn in *its* language, not the active one, and the
 * skins are scoped to `html[data-brand]` — a nested subtree cannot opt into
 * one. So each card carries its language's values as inline custom properties
 * (`--background`, `--primary`, `--radius-button`, the heading face…), read
 * from the Brand Package and, for Factory, from the token values. Everything
 * inside then uses the ordinary semantic utilities, which resolve against the
 * nearest declaration. Nothing here is typed in.
 */

import { getBuiltInBrandPackage } from "@nebutra/theme";
import { LANGUAGES, useDesignLanguage } from "@nebutra/theme/language-switcher";
import { useTheme } from "@nebutra/tokens";
import { tokenValue } from "@nebutra/tokens/values";
import { cn } from "@nebutra/ui/utils";
import type * as React from "react";
import { useMounted } from "@/lib/use-mounted";

type Mode = "light" | "dark";

interface Spec {
  vars: Record<string, string>;
  palette: [string, string, string];
}

function factorySpec(mode: Mode): Spec {
  const v = (name: Parameters<typeof tokenValue>[0]) => tokenValue(name, mode);
  return {
    vars: {
      "--background": v("--background"),
      "--foreground": v("--foreground"),
      "--card": v("--card"),
      "--card-foreground": v("--foreground"),
      "--muted-foreground": v("--muted-foreground"),
      "--muted": v("--muted"),
      "--primary": v("--primary"),
      "--primary-foreground": v("--primary-foreground"),
      "--secondary": v("--secondary"),
      "--secondary-foreground": v("--secondary-foreground"),
      "--border": v("--border"),
      "--success": v("--success"),
      "--mini-radius-button": v("--radius-button"),
      "--mini-radius-card": v("--radius-card"),
      "--mini-font-sans": v("--font-sans"),
      "--mini-font-heading": v("--font-heading"),
      "--mini-heading-weight": "500",
    },
    palette: [`hsl(${v("--background")})`, `hsl(${v("--foreground")})`, `hsl(${v("--primary")})`],
  };
}

function packageSpec(id: string, mode: Mode): Spec | null {
  const pkg = getBuiltInBrandPackage(id);
  if (!pkg) return null;
  const s = pkg.modes?.[mode]?.semantic ?? pkg.semantic;
  const radii = pkg.recipe.radii;
  const type = pkg.typography;
  return {
    vars: {
      "--background": s.background,
      "--foreground": s.foreground,
      "--card": s.card,
      "--card-foreground": s.cardForeground,
      "--muted-foreground": s.mutedForeground,
      "--primary": s.primary,
      "--primary-foreground": s.primaryForeground,
      "--secondary": s.secondary,
      "--secondary-foreground": s.secondaryForeground,
      "--border": s.border,
      ...(s.success ? { "--success": s.success } : {}),
      "--mini-radius-button": radii.button,
      "--mini-radius-card": radii.card,
      "--mini-font-sans": type.fontSans,
      "--mini-font-heading": type.fontDisplay ?? type.fontSans,
      "--mini-heading-weight": String(type.headingWeight ?? 600),
    },
    palette: [`hsl(${s.background})`, `hsl(${s.foreground})`, `hsl(${s.primary})`],
  };
}

function specFor(id: string, mode: Mode): Spec | null {
  return id === "factory" ? factorySpec(mode) : packageSpec(id, mode);
}

const ROWS = [
  { name: "sailor-web", meta: "Ready", selected: true },
  { name: "sailor-docs", meta: "2m", selected: false },
  { name: "router", meta: "1h", selected: false },
  { name: "studio", meta: "3h", selected: false },
];

/**
 * A small working screen in the language: a search field, a list with its
 * selected row, a footer with the primary and secondary action. Canvas, card,
 * ink, muted ink, border, both fills, both radii and the heading face all show.
 */
function Miniature({ spec }: { spec: Spec }) {
  const heading: React.CSSProperties = {
    fontFamily: "var(--mini-font-heading)",
    fontWeight: "var(--mini-heading-weight)" as React.CSSProperties["fontWeight"],
  };
  return (
    <span
      aria-hidden
      className="flex aspect-[16/9] w-full flex-col bg-background px-4 pt-4 text-foreground"
      style={{ ...(spec.vars as React.CSSProperties), fontFamily: "var(--mini-font-sans)" }}
    >
      <span className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[var(--mini-radius-card)] border border-border border-b-0 bg-card text-card-foreground">
        <span className="flex items-center justify-between gap-2 border-border border-b px-3 py-2">
          <span className="truncate text-xs" style={heading}>
            Deployments
          </span>
          <span className="inline-flex h-5 items-center rounded-[var(--mini-radius-button)] bg-primary px-2 font-medium text-2xs text-primary-foreground">
            Promote
          </span>
        </span>
        <span className="flex flex-col gap-0.5 p-1.5">
          {ROWS.map((row) => (
            <span
              className={cn(
                "flex items-center justify-between gap-2 rounded-[var(--mini-radius-button)] px-2 py-1 text-2xs",
                row.selected ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
              )}
              key={row.name}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    row.selected ? "bg-success" : "bg-muted-foreground",
                  )}
                />
                <span className="truncate">{row.name}</span>
              </span>
              <span className="shrink-0 tabular-nums">{row.meta}</span>
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

export function LanguageGallery({ className }: { className?: string }) {
  const { active, select } = useDesignLanguage();
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  // The miniatures follow the site's mode, so each shows what pressing it
  // would do to this page as it is now. Light until the stored theme is known.
  const mode: Mode = mounted && resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div className={cn("grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3", className)}>
      {LANGUAGES.map((language) => {
        const spec = specFor(language.id, mode);
        if (!spec) return null;
        const checked = language.id === active;
        return (
          <button
            aria-label={`${language.name} design language`}
            aria-pressed={checked}
            className="group/tile flex min-w-0 flex-col gap-3 text-left"
            key={language.id}
            onClick={() => select(language.id)}
            type="button"
          >
            <span
              className={cn(
                "block w-full overflow-hidden rounded-lg border transition-[border-color,box-shadow] duration-flow ease-out",
                checked
                  ? "border-foreground shadow-ambient-sm"
                  : "border-border group-hover/tile:border-input group-hover/tile:shadow-ambient-sm",
              )}
            >
              <Miniature spec={spec} />
            </span>
            <span className="flex items-start justify-between gap-3 px-0.5">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium text-foreground text-sm">
                  {language.name}
                </span>
                {language.tagline ? (
                  <span className="truncate text-muted-foreground text-xs">{language.tagline}</span>
                ) : null}
              </span>
              <span aria-hidden className="mt-1 flex shrink-0 -space-x-1">
                {spec.palette.map((colour, index) => (
                  <span
                    className="size-3 rounded-full ring-1 ring-border"
                    key={index}
                    style={{ background: colour }}
                  />
                ))}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
