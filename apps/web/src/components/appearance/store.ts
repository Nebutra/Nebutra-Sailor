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

/**
 * "Reduce motion": follow the OS, or reduce regardless. There is no "always
 * animate" — overriding an OS reduced-motion request is not ours to offer.
 * (A former third value, "off", was applied as reduce while labelled "Reduce
 * motion: Off"; persisted "off" now sanitizes to "system".)
 */
export type AppearanceMotion = "system" | "on";

// A concrete px size, or "theme" = follow the active theme/DESIGN type-scale
// (--text-base via @nebutra/ui fonts.css), falling back to the app default when
// the theme defines none.
export type AppearanceFontSize = number | "theme";

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
   * Selected design-language id (`LANGUAGE_REGISTRY`), or `"factory"` for
   * base Nebutra product chrome (no Brand Package skin). Validated loosely
   * (short kebab slug) so this global bundle never imports the language
   * catalog; unknown ids degrade to factory when applied.
   *
   * Back-compat: persisted `"default"` is coerced to `"factory"` on load.
   */
  theme: string;
  /**
   * A DESIGN.md theme imported by the user and applied app-wide (persisted).
   * When set, takes precedence over the design-language id. Cleared whenever
   * the user picks a language or clicks "Remove".
   */
  importedTheme: ImportedThemeSnapshot | null;
  accent: AppearanceAccent;
  uiFontSize: AppearanceFontSize;
  codeFontSize: AppearanceFontSize;
  motion: AppearanceMotion;
  transparency: boolean;
  backgroundColor: string | null;
  foregroundColor: string | null;
  uiFontFamily: AppearanceUiFontFamily;
  codeFontFamily: AppearanceCodeFontFamily;
  pointerCursor: boolean;
  diffMarkers: AppearanceDiffMarkers;
  fontSmoothing: boolean;
};

export const APPEARANCE_STORAGE_KEY = "nebutra:appearance:v1";

/** Canonical factory language id — product chrome SSOT, no skin. */
export const APPEARANCE_FACTORY_LANGUAGE = "factory";

export const APPEARANCE_DEFAULTS: AppearanceState = {
  theme: APPEARANCE_FACTORY_LANGUAGE,
  importedTheme: null,
  accent: "default",
  uiFontSize: "theme",
  codeFontSize: "theme",
  motion: "system",
  transparency: false,
  backgroundColor: null,
  foregroundColor: null,
  uiFontFamily: "theme",
  codeFontFamily: "theme",
  pointerCursor: false,
  diffMarkers: "color",
  fontSmoothing: true,
};

/**
 * The accent presets a user can pick — one list, read by the swatch picker and
 * the colour-picker row. (They each used to carry a copy, one commented
 * "mirror accent-swatch-picker palette".)
 */
export const ACCENT_SWATCHES: Record<Exclude<AppearanceAccent, "default">, string> = {
  blue: "#3b82f6",
  cyan: "#06b6d4",
  violet: "#8b5cf6",
  pink: "#ec4899",
  amber: "#f59e0b",
  green: "#10b981",
  red: "#ef4444",
};

/**
 * The accent drives --ring — House's one saturated hue: focus rings, selection,
 * links. The action fill (--primary, ink) is deliberately left alone. --ring
 * holds bare HSL channels, so the preset hex is converted; "default" returns
 * null and the token value stands.
 */
export function accentRingChannels(accent: AppearanceAccent): string | null {
  if (accent === "default") return null;
  const n = Number.parseInt(ACCENT_SWATCHES[accent].slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255) as [
    number,
    number,
    number,
  ];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const round = (v: number) => Math.round(v * 10) / 10;
  return `${round((h * 60 + 360) % 360)} ${round(sat * 100)}% ${round(l * 100)}%`;
}

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

const MOTION_VALUES: AppearanceMotion[] = ["system", "on"];

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

function sanitizeFontSize(value: unknown, min: number, max: number): AppearanceFontSize {
  if (value === "theme") return "theme";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "theme";
  return Math.min(max, Math.max(min, Math.round(n)));
}

function sanitizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return HEX_RE.test(value) ? value : null;
}

// Loose: accept any short id string (language ids are kebab-case slugs). We do
// NOT import LANGUAGE_REGISTRY here to keep the global appearance bundle lean;
// unknown ids resolve to factory when applied.
const THEME_ID_RE = /^[a-z0-9-]{1,64}$/;
function sanitizeTheme(value: unknown): string {
  if (typeof value !== "string" || !THEME_ID_RE.test(value)) {
    return APPEARANCE_DEFAULTS.theme;
  }
  // v1 storage used "default" for factory product chrome
  if (value === "default" || value === "nebutra") return APPEARANCE_FACTORY_LANGUAGE;
  return value;
}

/** True when the stored id means factory product chrome (no design-language skin). */
export function isFactoryLanguageId(id: string | null | undefined): boolean {
  return !id || id === APPEARANCE_FACTORY_LANGUAGE || id === "default" || id === "nebutra";
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
    uiFontSize: sanitizeFontSize(r.uiFontSize, 12, 18),
    codeFontSize: sanitizeFontSize(r.codeFontSize, 10, 18),
    transparency:
      typeof r.transparency === "boolean" ? r.transparency : APPEARANCE_DEFAULTS.transparency,
    backgroundColor: sanitizeHexColor(r.backgroundColor),
    foregroundColor: sanitizeHexColor(r.foregroundColor),
    uiFontFamily,
    codeFontFamily,
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
