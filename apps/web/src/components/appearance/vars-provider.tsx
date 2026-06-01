"use client";

import { useEffect, useRef, useState } from "react";

import { CODE_FONT_STACKS, UI_FONT_STACKS, useAppearance, useAppearanceStore } from "./store";

// ─── Browser-probe CSS-color → HSL triple ────────────────────────────────────
//
// The theme resolvers emit --color-* values as oklch(), hex, or color-mix().
// The app's shadcn base vars (--background, --primary, …) are consumed via
// `hsl(var(--background))` — they must be HSL *channel triples*, e.g. "228 85% 56%".
// Tailwind v4 @theme inline inlines --color-background at build time so writing
// --color-background at runtime has no effect on compiled utility classes.
//
// Solution: convert every theme color to an HSL triple by RASTERIZING it via a
// 1×1 canvas (getImageData yields sRGB bytes for any syntax). NOTE: a DOM probe
// + getComputedStyle().color is NOT enough on its own — modern engines preserve
// oklch()/color() as-authored, so a regex for rgb() fails on built-in themes.
//
// The probe element + canvas are created once (module-scoped) and reused for all
// conversions in a single theme-apply cycle.

let colorProbe: HTMLSpanElement | null = null;
let colorCanvas: HTMLCanvasElement | null = null;
let colorCtx: CanvasRenderingContext2D | null = null;

/**
 * Resolve any CSS color (oklch / hex / rgb / hsl / color-mix) to sRGB [r,g,b] in 0-1.
 *
 * CRITICAL: getComputedStyle().color does NOT always normalize to rgb() — modern
 * engines preserve oklch()/color() as-authored, so a regex for rgb() fails on
 * built-in (oklch) themes. So we (1) resolve via a probe element (this composites
 * color-mix / relative-color into a concrete computed color), then (2) RASTERIZE
 * that to sRGB bytes via a 1×1 canvas — getImageData always returns rgb regardless
 * of the source color syntax. This is what makes built-in oklch themes apply.
 */
function toSrgb(cssColor: string): [number, number, number] | null {
  if (typeof document === "undefined") return null;
  if (!colorProbe) {
    colorProbe = document.createElement("span");
    colorProbe.style.cssText =
      "position:absolute;width:0;height:0;visibility:hidden;pointer-events:none;";
    document.body.appendChild(colorProbe);
  }
  colorProbe.style.color = "";
  colorProbe.style.color = cssColor;
  const resolved = getComputedStyle(colorProbe).color || cssColor;

  if (!colorCtx) {
    colorCanvas = document.createElement("canvas");
    colorCanvas.width = 1;
    colorCanvas.height = 1;
    colorCtx = colorCanvas.getContext("2d", { willReadFrequently: true });
  }
  if (!colorCtx) return null;
  colorCtx.clearRect(0, 0, 1, 1);
  colorCtx.fillStyle = "rgba(1, 2, 3, 0.5)";
  const fallbackFillStyle = colorCtx.fillStyle;
  colorCtx.fillStyle = resolved; // invalid color leaves fillStyle unchanged
  if (colorCtx.fillStyle === fallbackFillStyle) {
    return null;
  }
  colorCtx.fillRect(0, 0, 1, 1);
  const data = colorCtx.getImageData(0, 0, 1, 1).data;
  return [(data[0] ?? 0) / 255, (data[1] ?? 0) / 255, (data[2] ?? 0) / 255];
}

/** Convert any CSS color string to an "H S% L%" triple, or null if unresolvable. */
function toHslTriple(cssColor: string): string | null {
  const srgb = toSrgb(cssColor);
  if (!srgb) return null;
  const r = srgb[0];
  const g = srgb[1];
  const b = srgb[2];

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Parse a CSS length ("1rem" / "16px" / "0.5") to a rem number, or null. */
function parseLengthRem(value: string | undefined): number | null {
  if (!value) return null;
  const m = /^(-?[\d.]+)(rem|px)?$/.exec(value.trim());
  if (!m?.[1]) return null;
  const n = Number.parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  return m[2] === "px" ? n / 16 : n; // px → rem; rem/unitless → rem
}

// ─── Shadcn role → base var mapping ─────────────────────────────────────────
//
// For each shadcn base var (--<role>), the corresponding theme color key is
// --color-<role>. Writes to these triples make hsl(var(--<role>)) resolve
// to the theme color everywhere in the app.

const SHADCN_ROLES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppearanceVarsProvider(): null {
  const [state] = useAppearance();
  // Dark-mode is owned by @nebutra/tokens ThemeProvider (toggles `.dark` on
  // <html>). We mirror it locally so a theme preset re-resolves its palette
  // when the user flips light/dark — without coupling to that provider's tree
  // position (we read the DOM class directly).
  const [isDark, setIsDark] = useState(false);
  // CSS custom-property names we last wrote for the active preset, so we can
  // remove exactly those when the preset changes or resets to "default".
  const appliedThemeVars = useRef<string[]>([]);

  // The store persists with skipHydration:true so SSR and the first client
  // render share APPEARANCE_DEFAULTS. Rehydrate once on mount to pull the
  // user's saved snapshot from localStorage without a hydration mismatch.
  useEffect(() => {
    void useAppearanceStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // "theme" defers to the theme/DESIGN type-scale (--text-base, consumed by
    // @nebutra/ui fonts.css): REMOVE the user override so the var() fallback
    // chain reaches it. A numeric size pins an explicit px value that wins.
    if (state.uiFontSize === "theme") {
      root.style.removeProperty("--user-ui-font-size");
    } else {
      root.style.setProperty("--user-ui-font-size", `${state.uiFontSize}px`);
    }
    if (state.codeFontSize === "theme") {
      root.style.removeProperty("--user-code-font-size");
    } else {
      root.style.setProperty("--user-code-font-size", `${state.codeFontSize}px`);
    }

    if (state.backgroundColor) {
      root.style.setProperty("--user-background", state.backgroundColor);
    } else {
      root.style.removeProperty("--user-background");
    }

    if (state.foregroundColor) {
      root.style.setProperty("--user-foreground", state.foregroundColor);
    } else {
      root.style.removeProperty("--user-foreground");
    }

    // "theme" defers to the active theme/DESIGN font (--font-sans / --font-mono):
    // we REMOVE the user override so the theme value drives the UI. An explicit
    // family pins its own stack on top, winning over the theme.
    if (state.uiFontFamily === "theme") {
      root.style.removeProperty("--user-ui-font");
    } else {
      root.style.setProperty("--user-ui-font", UI_FONT_STACKS[state.uiFontFamily]);
    }
    if (state.codeFontFamily === "theme") {
      root.style.removeProperty("--user-code-font");
    } else {
      root.style.setProperty("--user-code-font", CODE_FONT_STACKS[state.codeFontFamily]);
    }
    root.style.setProperty("--user-contrast", `${state.contrast}`);

    root.dataset.accent = state.accent;
    root.classList.toggle("surface-translucent", state.transparency);
    root.classList.toggle("cursor-pointer-interactive", state.pointerCursor);
    root.classList.toggle("font-smoothing-mac", state.fontSmoothing);
    root.classList.toggle("diff-markers-plusminus", state.diffMarkers === "plusminus");

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const reduce = state.motion === "off" || (state.motion === "system" && prefersReduced);
    const allow = state.motion === "on";

    root.classList.toggle("motion-reduce", reduce);
    root.classList.toggle("motion-allow", allow);
  }, [state]);

  // Mirror the `.dark` class on <html> into local state (initial read + observe).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const read = () => setIsDark(root.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Apply the selected Theme Playground preset (or imported DESIGN.md theme)
  // across the whole app. The heavy theme token-sets (~78 themes) and the
  // DESIGN.md token resolver are lazy-imported only when actually needed, so
  // neither path adds anything to the global bundle.
  // Precedence: importedTheme > theme preset > default (no-op).
  //
  // KEY FIX: instead of (only) writing --color-* vars (which Tailwind v4
  // @theme inline inlines at build time and therefore ignores at runtime),
  // we convert each theme color to an HSL triple and write the shadcn BASE
  // vars (--background, --primary, …). The app consumes these as
  // hsl(var(--background)) etc. — those are runtime var() calls that DO
  // reflect property changes on <html>.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // Always clear the previously-applied preset vars first.
    for (const name of appliedThemeVars.current) root.style.removeProperty(name);
    appliedThemeVars.current = [];

    const mode = isDark ? "dark" : "light";

    /** Shared setter — records the var name so we can remove it next cycle. */
    const applied: string[] = [];
    const set = (name: string, value: string | undefined) => {
      if (!value) return;
      root.style.setProperty(name, value);
      applied.push(name);
    };

    /**
     * Core helper: given the resolved --color-* style record from a theme
     * resolver, write the shadcn base HSL triple vars on <html>.
     *
     * For every shadcn role (e.g. "background"), we:
     *   1. Look up the resolved --color-background oklch/hex value.
     *   2. Convert it to an HSL triple via the DOM probe.
     *   3. Set --background (the base var) to that triple.
     *
     * This makes hsl(var(--background)) resolve to the theme color, which is
     * what every Tailwind utility class and direct CSS reference reads.
     */
    function applyBaseHslVars(style: Record<string, string>) {
      for (const role of SHADCN_ROLES) {
        const colorValue = style[`--color-${role}`];
        if (!colorValue) continue;
        const triple = toHslTriple(colorValue);
        if (triple) set(`--${role}`, triple);
      }
    }

    /**
     * Sidebar vars — the playground canvas has no sidebar, so neither resolver
     * emits these. We derive them from the resolved brand/surface colors.
     * Written as HSL triples (--sidebar, not --color-sidebar) to match the
     * same pattern as the rest of the shadcn base vars.
     */
    function applySidebarHslVars(style: Record<string, string>) {
      const pairs: Array<[string, string | undefined]> = [
        ["--sidebar", style["--color-card"] ?? style["--color-background"]],
        ["--sidebar-foreground", style["--color-card-foreground"] ?? style["--color-foreground"]],
        ["--sidebar-primary", style["--color-primary"]],
        ["--sidebar-primary-foreground", style["--color-primary-foreground"]],
        ["--sidebar-accent", style["--color-accent"] ?? style["--color-muted"]],
        [
          "--sidebar-accent-foreground",
          style["--color-accent-foreground"] ?? style["--color-foreground"],
        ],
        ["--sidebar-border", style["--color-border"]],
        ["--sidebar-ring", style["--color-ring"]],
      ];

      for (const [varName, colorValue] of pairs) {
        if (!colorValue) continue;
        const triple = toHslTriple(colorValue);
        if (triple) set(varName, triple);
      }
    }

    /**
     * Radius — the app reads the full scale directly (e.g.
     * rounded-[var(--radius-lg)]), so we copy every emitted step, not just one.
     * Also mirror --radius-md → --radius (shadcn primitives' calc() base).
     * Values are already lengths (e.g. "0.5rem"); no conversion needed.
     */
    function applyRadiusVars(style: Record<string, string>) {
      for (const key of ["sm", "md", "lg", "xl", "full"]) {
        set(`--radius-${key}`, style[`--radius-${key}`]);
      }
      const radiusMd = style["--radius-md"];
      if (radiusMd) set("--radius", radiusMd);
    }

    /**
     * Font family — set the theme's sans / heading / mono base vars. These layer
     * UNDER the user's explicit font override (--user-ui-font / --user-code-font)
     * and any locale CJK font rules, so a theme font shows wherever those don't
     * shadow it (headings, code surfaces, font-sans utilities).
     */
    function applyFontVars(style: Record<string, string>) {
      set("--font-sans", style["--font-sans"]);
      set("--font-heading", style["--font-heading"]);
      set("--font-mono", style["--font-mono"]);
    }

    /**
     * Shadow / elevation — copy the emitted shadow scale so cards, popovers and
     * any `box-shadow: var(--shadow-*)` consumer reflects the theme's elevation.
     */
    function applyShadowVars(style: Record<string, string>) {
      for (const key of ["sm", "md", "lg", "xl"]) {
        set(`--shadow-${key}`, style[`--shadow-${key}`]);
      }
    }

    /**
     * Type-scale — base/heading size + heading weight. body font-size consumes
     * --text-base when the user defers (see globals.css); h1-h6 weight consumes
     * --font-weight-heading. Built-in presets carry none of these (no-op); they
     * arrive via DESIGN.md imports.
     */
    function applyTypeScaleVars(style: Record<string, string>) {
      set("--text-base", style["--text-base"]);
      set("--text-heading", style["--text-heading"]);
      set("--font-weight-heading", style["--font-weight-heading"]);
    }

    /**
     * Spacing density — expose the raw scale, then remap Tailwind's --spacing
     * base from the theme's medium step so all p-/m-/gap- utilities scale with
     * the theme's rhythm. Reference: a comfortable DESIGN.md spacing.md ≈ 1rem,
     * matching Tailwind's default (--spacing 0.25rem → p-4 = 1rem). The factor
     * is clamped to [0.75, 1.5] so an extreme import can't break the layout.
     */
    function applySpacingVars(style: Record<string, string>) {
      for (const key of ["sm", "md", "lg", "xl"]) {
        set(`--spacing-${key}`, style[`--spacing-${key}`]);
      }
      const mdRem = parseLengthRem(style["--spacing-md"]);
      if (mdRem != null) {
        const factor = Math.min(1.5, Math.max(0.75, mdRem)); // md(rem) vs 1rem ref
        set("--spacing", `${(0.25 * factor).toFixed(4)}rem`);
      }
    }

    /** Apply every consumed non-color dimension a theme can carry. */
    function applyNonColorVars(style: Record<string, string>) {
      applyRadiusVars(style);
      applyFontVars(style);
      applyShadowVars(style);
      applyTypeScaleVars(style);
      applySpacingVars(style);
    }

    // ── Branch 1: DESIGN.md imported theme ──────────────────────────────────
    if (state.importedTheme) {
      const snapshot = state.importedTheme;
      let cancelled = false;
      void import("@/components/theme-playground/theme-token-data").then(
        ({ getPreviewStyleFromTokenSet }) => {
          if (cancelled) return;
          const style = getPreviewStyleFromTokenSet(
            // The snapshot tokenSet matches ThemeTokenSet shape at runtime.
            // Cast through unknown to bridge the optional-value index signature gap.
            snapshot.tokenSet as unknown as Parameters<typeof getPreviewStyleFromTokenSet>[0],
            mode,
          ) as Record<string, string>;

          applyBaseHslVars(style);
          applySidebarHslVars(style);
          applyNonColorVars(style);

          appliedThemeVars.current = applied;
          root.setAttribute("data-theme-preset", "imported");
        },
      );
      return () => {
        cancelled = true;
      };
    }

    // ── Branch 2: registry preset ────────────────────────────────────────────
    if (!state.theme || state.theme === "default") {
      root.removeAttribute("data-theme-preset");
      return;
    }

    let cancelled = false;
    void import("@/components/theme-playground/theme-token-data").then(
      ({ getThemePreviewStyle }) => {
        if (cancelled || state.theme === "default") return;
        const style = getThemePreviewStyle(state.theme, mode) as Record<string, string>;

        applyBaseHslVars(style);
        applySidebarHslVars(style);
        applyNonColorVars(style);

        appliedThemeVars.current = applied;
        root.setAttribute("data-theme-preset", state.theme);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [state.importedTheme, state.theme, isDark]);

  useEffect(() => {
    if (state.motion !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      const root = document.documentElement;
      root.classList.toggle("motion-reduce", mq.matches);
      root.classList.toggle("motion-allow", false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [state.motion]);

  return null;
}
