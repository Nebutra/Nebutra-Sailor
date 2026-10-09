/**
 * Public-page colour mode. `system` follows `prefers-color-scheme`; an explicit light or dark choice
 * persists and wins. The blocking theme-init script (scripts/landing-plugin.mjs) applies the same
 * resolution before first paint, so hydration never flips the page.
 */
export const THEME_STORAGE_KEY = "kcq:theme";
export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ThemeMode = "light" | "dark";

type ThemeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readThemePreference(storage: Pick<Storage, "getItem"> | undefined): ThemePreference {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function storeThemePreference(storage: ThemeStorage | undefined, preference: ThemePreference) {
  try {
    if (preference === "system") storage?.removeItem(THEME_STORAGE_KEY);
    else storage?.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Blocked storage: the choice still applies to this page view.
  }
}

export function resolveThemeMode(preference: ThemePreference, systemDark: boolean): ThemeMode {
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}

/**
 * Swap `data-theme` with every transition suspended for one style recalculation, so the page
 * changes at once instead of cross-fading each element (Paco Coursey; craft-principles rule 41).
 */
export function applyThemeMode(root: HTMLElement, mode: ThemeMode) {
  if (root.getAttribute("data-theme") === mode) return;
  const pause = root.ownerDocument.createElement("style");
  pause.textContent = "*,*::before,*::after{transition:none!important}";
  root.ownerDocument.head.appendChild(pause);
  root.setAttribute("data-theme", mode);
  root.ownerDocument.defaultView?.getComputedStyle(root).opacity;
  pause.remove();
}
