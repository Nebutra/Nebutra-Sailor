"use client";

import { useSyncExternalStore } from "react";

/**
 * Startup OS chrome-mode store — the single source of truth for whether the
 * Startup OS surface is showing its HOME (entry / "what are we building?") or a
 * project WORKSPACE (the full-bleed builder).
 *
 * Why a module store and not props/context: home and workspace share ONE route
 * (`/startup-os`) and the selected-project state lives deep inside the command
 * center, while the chrome that must react to it (the AppShell sidebar) lives in
 * an ANCESTOR (the design-system shell). Context only flows down, so the shell
 * can't read a descendant's state. A tiny external store lets the command center
 * PUBLISH its mode and the shell SUBSCRIBE — one coherent signal drives all
 * startup-os chrome (sidebar overlay/visibility today; top-bar/route chrome
 * later), instead of per-route `isStartupOSRoute` flags that can't tell the two
 * states apart (which is what hid the home sidebar).
 */

export type StartupChromeMode = "home" | "workspace";

let currentMode: StartupChromeMode = "home";
const listeners = new Set<() => void>();

/** Publish the current Startup OS chrome mode (called by the command center). */
export function setStartupChromeMode(next: StartupChromeMode): void {
  if (currentMode === next) return;
  currentMode = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Subscribe to the Startup OS chrome mode (consumed by the design-system shell). */
export function useStartupChromeMode(): StartupChromeMode {
  return useSyncExternalStore(
    subscribe,
    () => currentMode,
    () => "home",
  );
}
