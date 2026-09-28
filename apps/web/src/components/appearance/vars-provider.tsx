"use client";

import { useEffect } from "react";
import { useAppearance, useAppearanceStore } from "./store";

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Applies the viewer's Appearance preferences to the DOM: font sizes
 * (--user-*), and the cursor, smoothing, diff-marker and motion-reduce classes.
 *
 * The product's look — design language, colours, fonts — is not a viewer
 * setting. It is chosen in Sailor Studio and applied to the project
 * (ADR 2026-09-27 Sailor Studio). Light/dark is owned by @nebutra/tokens
 * ThemeProvider (class="dark").
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

    root.classList.toggle("cursor-pointer-interactive", state.pointerCursor);
    root.classList.toggle("font-smoothing-mac", state.fontSmoothing);
    root.classList.toggle("diff-markers-plusminus", state.diffMarkers === "plusminus");

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // "Reduce motion: On" reduces; "System" follows the OS.
    root.classList.toggle("motion-reduce", state.motion === "on" || prefersReduced);
  }, [state]);

  useEffect(() => {
    if (state.motion !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      const root = document.documentElement;
      root.classList.toggle("motion-reduce", mq.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [state.motion]);

  return null;
}
