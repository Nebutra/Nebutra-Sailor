"use client";

import { useEffect, useRef, useState } from "react";

import { CODE_FONT_STACKS, UI_FONT_STACKS, useAppearance, useAppearanceStore } from "./store";

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

    root.style.setProperty("--user-ui-font-size", `${state.uiFontSize}px`);
    root.style.setProperty("--user-code-font-size", `${state.codeFontSize}px`);

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

    root.style.setProperty("--user-ui-font", UI_FONT_STACKS[state.uiFontFamily]);
    root.style.setProperty("--user-code-font", CODE_FONT_STACKS[state.codeFontFamily]);
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

  // Apply the selected Theme Playground preset across the whole app. The heavy
  // theme token-sets (~78 themes) are lazy-imported only when a preset is
  // actually active, so the default ("default") path adds nothing to the
  // global bundle. Granular controls above (accent/background/fonts) layer on
  // top because they use independent vars/attributes, not `--color-*`.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // Always clear the previously-applied preset vars first.
    for (const name of appliedThemeVars.current) root.style.removeProperty(name);
    appliedThemeVars.current = [];

    if (!state.theme || state.theme === "default") {
      root.removeAttribute("data-theme-preset");
      return;
    }

    let cancelled = false;
    void import("@/components/theme-playground/theme-token-data").then(
      ({ getThemePreviewStyle }) => {
        if (cancelled || state.theme === "default") return;
        const mode = isDark ? "dark" : "light";
        const style = getThemePreviewStyle(state.theme, mode) as Record<string, string>;
        const applied: string[] = [];
        const set = (name: string, value: string | undefined) => {
          if (!value) return;
          root.style.setProperty(name, value);
          applied.push(name);
        };

        // Theme palette → app surface/brand vars (skip non-custom-prop keys like colorScheme).
        for (const [key, value] of Object.entries(style)) {
          if (key.startsWith("--")) set(key, value);
        }

        // Bridge the nav rail so the sidebar follows the theme — the playground
        // canvas has no sidebar, so getThemePreviewStyle never emits these.
        set("--color-sidebar", style["--color-card"] ?? style["--color-background"]);
        set(
          "--color-sidebar-foreground",
          style["--color-card-foreground"] ?? style["--color-foreground"],
        );
        set("--color-sidebar-primary", style["--color-primary"]);
        set("--color-sidebar-primary-foreground", style["--color-primary-foreground"]);
        set("--color-sidebar-accent", style["--color-accent"] ?? style["--color-muted"]);
        set(
          "--color-sidebar-accent-foreground",
          style["--color-accent-foreground"] ?? style["--color-foreground"],
        );
        set("--color-sidebar-border", style["--color-border"]);
        set("--color-sidebar-ring", style["--color-ring"]);

        appliedThemeVars.current = applied;
        root.setAttribute("data-theme-preset", state.theme);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [state.theme, isDark]);

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
