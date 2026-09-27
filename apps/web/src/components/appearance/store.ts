"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

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

export type AppearanceDiffMarkers = "color" | "plusminus";

/**
 * The viewer's own preferences. How the product looks — its design language,
 * colours and fonts — is the owner's decision, made in Sailor Studio and
 * applied to the project (ADR 2026-09-27 Sailor Studio); it is not a setting
 * here. Snapshots persisted before that change still carry `theme`,
 * `importedTheme`, `accent`, colours and font families: sanitize drops them.
 */
export type AppearanceState = {
  uiFontSize: AppearanceFontSize;
  codeFontSize: AppearanceFontSize;
  motion: AppearanceMotion;
  pointerCursor: boolean;
  diffMarkers: AppearanceDiffMarkers;
  fontSmoothing: boolean;
};

export const APPEARANCE_STORAGE_KEY = "nebutra:appearance:v1";

export const APPEARANCE_DEFAULTS: AppearanceState = {
  uiFontSize: "theme",
  codeFontSize: "theme",
  motion: "system",
  pointerCursor: false,
  diffMarkers: "color",
  fontSmoothing: true,
};

const MOTION_VALUES: AppearanceMotion[] = ["system", "on"];

const DIFF_MARKER_VALUES: AppearanceDiffMarkers[] = ["color", "plusminus"];

function sanitizeFontSize(value: unknown, min: number, max: number): AppearanceFontSize {
  if (value === "theme") return "theme";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "theme";
  return Math.min(max, Math.max(min, Math.round(n)));
}

function sanitize(raw: unknown): AppearanceState {
  if (!raw || typeof raw !== "object") return APPEARANCE_DEFAULTS;
  const r = raw as Record<string, unknown>;
  const motion = MOTION_VALUES.includes(r.motion as AppearanceMotion)
    ? (r.motion as AppearanceMotion)
    : APPEARANCE_DEFAULTS.motion;
  const diffMarkers = DIFF_MARKER_VALUES.includes(r.diffMarkers as AppearanceDiffMarkers)
    ? (r.diffMarkers as AppearanceDiffMarkers)
    : APPEARANCE_DEFAULTS.diffMarkers;
  return {
    motion,
    uiFontSize: sanitizeFontSize(r.uiFontSize, 12, 18),
    codeFontSize: sanitizeFontSize(r.codeFontSize, 10, 18),
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
