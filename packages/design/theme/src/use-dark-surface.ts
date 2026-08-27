"use client";

/**
 * Is the surface actually dark, whatever the theme is called?
 *
 * Components that flip an asset for a dark background — an inverted wordmark, a
 * mono logomark — asked `resolvedTheme !== "light"`. That was the same question
 * as long as the only way to get a dark canvas was the theme toggle. Design
 * languages broke the equivalence: gsap, linear and raycast paint a dark canvas
 * while the theme is still light, so the navbar rendered the dark wordmark on
 * the dark canvas and the logo disappeared.
 *
 * The canvas knows. `--background` holds the bare HSL channels the active skin
 * resolved to, and its third component is the lightness — one reading answers
 * for the theme, the design language, and any combination of the two, including
 * ones that do not exist yet.
 */

import * as React from "react";

/** Lightness below this reads as a dark surface. */
const DARK_THRESHOLD = 50;

function readCanvasLightness(): number | null {
  if (typeof document === "undefined") return null;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
  // "222 47% 11%" — the shadcn-style tokens are channels, not colours.
  const lightness = raw.split(/\s+/)[2];
  if (!lightness) return null;
  const parsed = Number.parseFloat(lightness);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * `null` until mounted, so a caller can hold the server markup for one paint
 * rather than guess and flip. The channels only exist once CSS has applied.
 */
export function useDarkSurface(): boolean | null {
  const [isDark, setIsDark] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const sync = () => {
      const lightness = readCanvasLightness();
      setIsDark(lightness === null ? null : lightness < DARK_THRESHOLD);
    };
    sync();

    // Both switches land on <html>: next-themes writes `class`, the language
    // switcher writes `data-brand`. Watching the element covers either without
    // knowing which one moved.
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-brand", "data-theme", "style"],
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
