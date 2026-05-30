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

export type AppearanceState = {
  accent: AppearanceAccent;
  uiFontSize: number;
  codeFontSize: number;
  motion: AppearanceMotion;
  transparency: boolean;
};

export const APPEARANCE_STORAGE_KEY = "nebutra:appearance:v1";

export const APPEARANCE_DEFAULTS: AppearanceState = {
  accent: "default",
  uiFontSize: 14,
  codeFontSize: 12,
  motion: "system",
  transparency: false,
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

function clampFontSize(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
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
  return {
    accent,
    motion,
    uiFontSize: clampFontSize(r.uiFontSize, 12, 18, APPEARANCE_DEFAULTS.uiFontSize),
    codeFontSize: clampFontSize(r.codeFontSize, 10, 18, APPEARANCE_DEFAULTS.codeFontSize),
    transparency:
      typeof r.transparency === "boolean" ? r.transparency : APPEARANCE_DEFAULTS.transparency,
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
  const next: AppearanceState = { ...current, ...patch };
  next.uiFontSize = clampFontSize(next.uiFontSize, 12, 18, APPEARANCE_DEFAULTS.uiFontSize);
  next.codeFontSize = clampFontSize(next.codeFontSize, 10, 18, APPEARANCE_DEFAULTS.codeFontSize);
  current = next;
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
