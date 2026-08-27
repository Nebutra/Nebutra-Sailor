"use client";

import { withRegistryFont } from "@nebutra/fonts";
import { useEffect } from "react";

import {
  CODE_FONT_STACKS,
  isFactoryLanguageId,
  UI_FONT_STACKS,
  useAppearance,
  useAppearanceStore,
} from "./store";

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Applies Appearance store → DOM:
 *   - user overrides (--user-*, data-accent, motion classes)
 *   - design language / DESIGN.md import via Brand Package carrier only
 *     (applyLanguage / applyImportedBrandPackage → inject skin + data-brand)
 *
 * Light/dark is owned by @nebutra/tokens ThemeProvider (class="dark").
 * Dual-mode Brand Packages emit separate light/dark CSS blocks; no canvas HSL probe.
 */
export default function AppearanceVarsProvider(): null {
  const [state] = useAppearance();

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
      const stack = UI_FONT_STACKS[state.uiFontFamily];
      root.style.setProperty("--user-ui-font", withRegistryFont(stack) ?? stack);
    }
    if (state.codeFontFamily === "theme") {
      root.style.removeProperty("--user-code-font");
    } else {
      const stack = CODE_FONT_STACKS[state.codeFontFamily];
      root.style.setProperty("--user-code-font", withRegistryFont(stack) ?? stack);
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

  // Apply design language (Brand Package carrier) or imported DESIGN.md.
  // Precedence: importedTheme > design language > factory (tokens SSOT).
  // Carrier only — no partial --color-* / canvas HSL dual path.
  useEffect(() => {
    if (typeof document === "undefined") return;

    // ── Branch 1: DESIGN.md import → Brand Package carrier only ──────────────
    if (state.importedTheme) {
      const snapshot = state.importedTheme;
      let cancelled = false;
      void import("./apply-imported-brand").then(({ applyImportedBrandPackage }) => {
        if (cancelled) return;
        const carrier = applyImportedBrandPackage(snapshot.name, snapshot.tokenSet);
        if (carrier.ok) return;
        // Carrier failed: restore factory SSOT
        void import("@nebutra/theme/client").then((m) => {
          if (!cancelled) m.clearLanguage();
        });
      });
      return () => {
        cancelled = true;
      };
    }

    // ── Branch 2: catalog design language ────────────────────────────────────
    let cancelled = false;
    void import("@nebutra/theme/client").then(({ applyLanguage, clearLanguage }) => {
      if (cancelled) return;
      if (isFactoryLanguageId(state.theme)) {
        clearLanguage();
        return;
      }
      try {
        applyLanguage(state.theme);
      } catch {
        clearLanguage();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [state.importedTheme, state.theme]);

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
