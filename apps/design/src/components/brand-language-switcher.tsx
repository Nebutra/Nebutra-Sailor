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
 */

import { cn } from "@nebutra/ui/utils";
import * as React from "react";

const STORAGE_KEY = "nebutra.design.brand";

/** Built-in languages that ship a skin under html[data-brand]. Order is
 * visual: factory first, then denser product languages, then marketing. */
const LANGUAGES: { id: string; label: string }[] = [
  { id: "factory", label: "Factory" },
  { id: "linear", label: "Linear" },
  { id: "vercel", label: "Vercel" },
  { id: "raycast", label: "Raycast" },
  { id: "stripe", label: "Stripe" },
  { id: "notion", label: "Notion" },
  { id: "vanta", label: "Vanta" },
  { id: "gsap", label: "GSAP" },
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

function applyBrand(id: string) {
  const root = document.documentElement;
  if (id === "factory") {
    delete root.dataset.brand;
  } else {
    root.dataset.brand = id;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode */
  }
}

export function BrandLanguageSwitcher({ className }: { className?: string }) {
  const [active, setActive] = React.useState("factory");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const stored = readStored();
    applyBrand(stored);
    setActive(stored);
    setReady(true);
  }, []);

  function select(id: string) {
    applyBrand(id);
    setActive(id);
  }

  return (
    <fieldset
      className={cn("m-0 flex flex-wrap items-center gap-1.5 border-0 p-0", className)}
      data-ready={ready ? "true" : "false"}
    >
      <legend className="mr-1 float-left w-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Language
      </legend>
      {LANGUAGES.map((lang) => {
        const isActive = active === lang.id;
        return (
          <button
            key={lang.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => select(lang.id)}
            className={cn(
              "rounded-[var(--radius-sm,0.25rem)] px-2 py-1 font-medium text-[11px] transition-colors",
              isActive
                ? "bg-foreground text-background"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {lang.label}
          </button>
        );
      })}
    </fieldset>
  );
}
