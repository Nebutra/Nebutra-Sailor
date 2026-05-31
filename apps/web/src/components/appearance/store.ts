"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

export type AppearanceAccent =
  | "default"
  | "blue"
  | "cyan"
  | "violet"
  | "pink"
  | "amber"
  | "green"
  | "red";

export type AppearanceMotion = "system" | "on" | "off";

// "theme" = follow the active theme / imported DESIGN.md font (consume
// var(--font-sans) / var(--font-mono)); the rest are explicit overrides.
export type AppearanceUiFontFamily = "theme" | "system" | "geist" | "inter" | "sf";

export type AppearanceCodeFontFamily =
  | "theme"
  | "system"
  | "geist-mono"
  | "sf-mono"
  | "jetbrains-mono";

export type AppearanceDiffMarkers = "color" | "plusminus";

/**
 * Snapshot of an imported DESIGN.md theme persisted in localStorage.
 *
 * Intentionally mirrors the DTCG token-group shape from ThemeTokenSet but is
 * declared inline so the global appearance bundle never imports
 * @nebutra/design-sync or theme-token-data. The resolver is lazy-loaded in
 * AppearanceVarsProvider.
 */
export type ImportedThemeSnapshot = {
  name: string;
  /**
   * DTCG token groups (color, radius, fontFamily, etc.) — each group maps
   * token keys to optional-leaf objects. Values may be undefined when a key
   * exists in the group but has no $value (mirrors ThemeTokenSet's index
   * signature).
   */
  tokenSet: Record<string, Record<string, { $value?: string; $type?: string } | undefined>>;
};

export type AppearanceState = {
  /**
   * Selected Theme Playground preset id (from @nebutra/theme registry), or
   * "default" for the base Nebutra palette. Validated loosely (any short
   * string) so the global appearance bundle never has to import the 74 KB
   * theme registry — unknown ids degrade gracefully to the base palette when
   * applied (AppearanceVarsProvider lazy-loads the token resolver).
   */
  theme: string;
  /**
   * A DESIGN.md theme imported by the user and applied app-wide (persisted).
   * When set, takes precedence over the `theme` preset. Cleared whenever the
   * user picks a registry preset or clicks "Remove".
   */
  importedTheme: ImportedThemeSnapshot | null;
  accent: AppearanceAccent;
  uiFontSize: number;
  codeFontSize: number;
  motion: AppearanceMotion;
  transparency: boolean;
  backgroundColor: string | null;
  foregroundColor: string | null;
  uiFontFamily: AppearanceUiFontFamily;
  codeFontFamily: AppearanceCodeFontFamily;
  contrast: number;
  pointerCursor: boolean;
  diffMarkers: AppearanceDiffMarkers;
  fontSmoothing: boolean;
};

export const APPEARANCE_STORAGE_KEY = "nebutra:appearance:v1";

export const APPEARANCE_DEFAULTS: AppearanceState = {
  theme: "default",
  importedTheme: null,
  accent: "default",
  uiFontSize: 14,
  codeFontSize: 12,
  motion: "system",
  transparency: false,
  backgroundColor: null,
  foregroundColor: null,
  uiFontFamily: "theme",
  codeFontFamily: "theme",
  contrast: 50,
  pointerCursor: false,
  diffMarkers: "color",
  fontSmoothing: true,
};

const ACCENT_VALUES: AppearanceAccent[] = [
  "default",
  "blue",
  "cyan",
  "violet",
  "pink",
  "amber",
  "green",
  "red",
];

const MOTION_VALUES: AppearanceMotion[] = ["system", "on", "off"];

const UI_FONT_FAMILY_VALUES: AppearanceUiFontFamily[] = ["theme", "system", "geist", "inter", "sf"];

const CODE_FONT_FAMILY_VALUES: AppearanceCodeFontFamily[] = [
  "theme",
  "system",
  "geist-mono",
  "sf-mono",
  "jetbrains-mono",
];

const DIFF_MARKER_VALUES: AppearanceDiffMarkers[] = ["color", "plusminus"];

// "theme" resolves to the active theme/DESIGN font var so the picker can defer
// to it; the explicit families pin a concrete stack regardless of theme.
export const UI_FONT_STACKS: Record<AppearanceUiFontFamily, string> = {
  theme: `var(--font-sans)`,
  system: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  geist: `'Geist', -apple-system, sans-serif`,
  inter: `'Inter', -apple-system, sans-serif`,
  sf: `'SF Pro Text', -apple-system, sans-serif`,
};

export const CODE_FONT_STACKS: Record<AppearanceCodeFontFamily, string> = {
  theme: `var(--font-mono)`,
  system: `ui-monospace, SFMono-Regular, Menlo, monospace`,
  "geist-mono": `'Geist Mono', ui-monospace, monospace`,
  "sf-mono": `'SF Mono', ui-monospace, monospace`,
  "jetbrains-mono": `'JetBrains Mono', ui-monospace, monospace`,
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function clampFontSize(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function sanitizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return HEX_RE.test(value) ? value : null;
}

// Loose: accept any short id string (registry ids are kebab-case slugs). We do
// NOT import the theme registry here to keep the global appearance bundle lean;
// unknown ids resolve to the base palette when applied.
const THEME_ID_RE = /^[a-z0-9-]{1,64}$/;
function sanitizeTheme(value: unknown): string {
  if (typeof value !== "string" || !THEME_ID_RE.test(value)) return APPEARANCE_DEFAULTS.theme;
  return value;
}

/**
 * Loose validation for ImportedThemeSnapshot.
 * Requires a string `name` and a plain-object `tokenSet`. We don't validate
 * each leaf shape — corrupt inner values simply won't match known keys in the
 * resolver and will be silently skipped. This keeps the store lean (no deep
 * parse or design-sync import).
 */
function sanitizeImportedTheme(value: unknown): ImportedThemeSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.name !== "string" || !v.name) return null;
  if (!v.tokenSet || typeof v.tokenSet !== "object" || Array.isArray(v.tokenSet)) return null;
  return { name: v.name, tokenSet: v.tokenSet as ImportedThemeSnapshot["tokenSet"] };
}

function clampContrast(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return APPEARANCE_DEFAULTS.contrast;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function sanitize(raw: unknown): AppearanceState {
  if (!raw || typeof raw !== "object") return APPEARANCE_DEFAULTS;
  const r = raw as Record<string, unknown>;
  const accent = ACCENT_VALUES.includes(r.accent as AppearanceAccent)
    ? (r.accent as AppearanceAccent)
    : APPEARANCE_DEFAULTS.accent;
  const motion = MOTION_VALUES.includes(r.motion as AppearanceMotion)
    ? (r.motion as AppearanceMotion)
    : APPEARANCE_DEFAULTS.motion;
  const uiFontFamily = UI_FONT_FAMILY_VALUES.includes(r.uiFontFamily as AppearanceUiFontFamily)
    ? (r.uiFontFamily as AppearanceUiFontFamily)
    : APPEARANCE_DEFAULTS.uiFontFamily;
  const codeFontFamily = CODE_FONT_FAMILY_VALUES.includes(
    r.codeFontFamily as AppearanceCodeFontFamily,
  )
    ? (r.codeFontFamily as AppearanceCodeFontFamily)
    : APPEARANCE_DEFAULTS.codeFontFamily;
  const diffMarkers = DIFF_MARKER_VALUES.includes(r.diffMarkers as AppearanceDiffMarkers)
    ? (r.diffMarkers as AppearanceDiffMarkers)
    : APPEARANCE_DEFAULTS.diffMarkers;
  return {
    theme: sanitizeTheme(r.theme),
    importedTheme: sanitizeImportedTheme(r.importedTheme),
    accent,
    motion,
    uiFontSize: clampFontSize(r.uiFontSize, 12, 18, APPEARANCE_DEFAULTS.uiFontSize),
    codeFontSize: clampFontSize(r.codeFontSize, 10, 18, APPEARANCE_DEFAULTS.codeFontSize),
    transparency:
      typeof r.transparency === "boolean" ? r.transparency : APPEARANCE_DEFAULTS.transparency,
    backgroundColor: sanitizeHexColor(r.backgroundColor),
    foregroundColor: sanitizeHexColor(r.foregroundColor),
    uiFontFamily,
    codeFontFamily,
    contrast: r.contrast === undefined ? APPEARANCE_DEFAULTS.contrast : clampContrast(r.contrast),
    pointerCursor:
      typeof r.pointerCursor === "boolean" ? r.pointerCursor : APPEARANCE_DEFAULTS.pointerCursor,
    diffMarkers,
    fontSmoothing:
      typeof r.fontSmoothing === "boolean" ? r.fontSmoothing : APPEARANCE_DEFAULTS.fontSmoothing,
  };
}

type AppearanceUpdate = (patch: Partial<AppearanceState>) => void;

type AppearanceStore = AppearanceState & { update: AppearanceUpdate };

export const useAppearanceStore = create<AppearanceStore>()(
  persist(
    (set, get) => ({
      ...APPEARANCE_DEFAULTS,
      // Re-run sanitize on every patch so partial updates respect bounds + unions.
      update: (patch) => set(sanitize({ ...get(), ...patch })),
    }),
    {
      name: APPEARANCE_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Strip the action before persisting; sanitize the rest.
      partialize: ({ update: _omit, ...state }) => state,
      // Custom merge mirrors the old sanitize-on-read behavior — corrupt or
      // partial snapshots fall back to defaults field-by-field.
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted) }),
      // SSR-safe: defer rehydration to AppearanceVarsProvider's mount effect
      // (it calls useAppearanceStore.persist.rehydrate()) so the server and
      // first client render agree on APPEARANCE_DEFAULTS — no hydration flash.
      skipHydration: true,
    },
  ),
);

const selectState = (s: AppearanceStore): AppearanceState => {
  const { update: _omit, ...state } = s;
  return state;
};

/**
 * Back-compat tuple hook. Returns [state, update] so the appearance
 * primitives stay unchanged. `state` is shallow-memoized; `update` is a
 * stable action reference.
 */
export function useAppearance(): [AppearanceState, AppearanceUpdate] {
  const state = useAppearanceStore(useShallow(selectState));
  const update = useAppearanceStore((s) => s.update);
  return [state, update];
}
