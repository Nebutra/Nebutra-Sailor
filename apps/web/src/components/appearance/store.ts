"use client";

import { useCallback, useEffect, useState } from "react";

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

export type AppearanceUiFontFamily = "system" | "geist" | "inter" | "sf";

export type AppearanceCodeFontFamily = "system" | "geist-mono" | "sf-mono" | "jetbrains-mono";

export type AppearanceDiffMarkers = "color" | "plusminus";

export type AppearanceState = {
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
  accent: "default",
  uiFontSize: 14,
  codeFontSize: 12,
  motion: "system",
  transparency: false,
  backgroundColor: null,
  foregroundColor: null,
  uiFontFamily: "system",
  codeFontFamily: "geist-mono",
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

const UI_FONT_FAMILY_VALUES: AppearanceUiFontFamily[] = ["system", "geist", "inter", "sf"];

const CODE_FONT_FAMILY_VALUES: AppearanceCodeFontFamily[] = [
  "system",
  "geist-mono",
  "sf-mono",
  "jetbrains-mono",
];

const DIFF_MARKER_VALUES: AppearanceDiffMarkers[] = ["color", "plusminus"];

export const UI_FONT_STACKS: Record<AppearanceUiFontFamily, string> = {
  system: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  geist: `'Geist', -apple-system, sans-serif`,
  inter: `'Inter', -apple-system, sans-serif`,
  sf: `'SF Pro Text', -apple-system, sans-serif`,
};

export const CODE_FONT_STACKS: Record<AppearanceCodeFontFamily, string> = {
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

type Listener = (state: AppearanceState) => void;
const listeners = new Set<Listener>();
let current: AppearanceState = APPEARANCE_DEFAULTS;
let hydrated = false;

function readFromStorage(): AppearanceState {
  if (typeof window === "undefined") return APPEARANCE_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return APPEARANCE_DEFAULTS;
    return sanitize(JSON.parse(raw));
  } catch {
    return APPEARANCE_DEFAULTS;
  }
}

function writeToStorage(state: AppearanceState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / disabled storage
  }
}

function emit(): void {
  for (const listener of listeners) listener(current);
}

function setState(patch: Partial<AppearanceState>): void {
  const merged: AppearanceState = { ...current, ...patch };
  // Re-run sanitize so partial updates respect bounds + unions.
  current = sanitize(merged);
  writeToStorage(current);
  emit();
}

export function useAppearance(): [AppearanceState, (patch: Partial<AppearanceState>) => void] {
  const [local, setLocal] = useState<AppearanceState>(current);

  useEffect(() => {
    if (!hydrated) {
      current = readFromStorage();
      hydrated = true;
      emit();
    }
    setLocal(current);
    const listener: Listener = (state) => setLocal(state);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const update = useCallback((patch: Partial<AppearanceState>) => {
    setState(patch);
  }, []);

  return [local, update];
}
