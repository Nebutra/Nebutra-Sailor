"use client";

import { type Icon as LucideIcon, MagnifyingGlass as Search, Workflow } from "@nebutra/icons";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

export type CommandMode = "workflow" | "search";

export type ModeAccent = "blue" | "cyan" | "green" | "neutral";

/**
 * A mode's `destination` is either an in-app path (string) or the literal
 * `"palette"` to open the global command palette. Modes without a real
 * surface MUST NOT be added — we do not advertise behavior we cannot deliver.
 */
export interface ModeMeta {
  id: CommandMode;
  label: string;
  icon: LucideIcon;
  placeholder: string;
  description: string;
  accent: ModeAccent;
  destination: string | "palette";
}

export const MODES: ReadonlyArray<ModeMeta> = [
  {
    id: "workflow",
    label: "Workflow",
    icon: Workflow,
    placeholder: "Connect integrations, queues, and triggers…",
    description: "Open integrations and workflow surfaces",
    accent: "green",
    destination: "/integrations",
  },
  {
    id: "search",
    label: "Search",
    icon: Search,
    placeholder: "Search commands, settings, and actions…",
    description: "Open the command palette",
    accent: "neutral",
    destination: "palette",
  },
] as const;

const DEFAULT_MODE: CommandMode = "search";

/**
 * Statically resolvable accent classes so Tailwind retains them.
 * Each mode owns its own surface palette via our scale tokens — no
 * raw hex, no off-system accents. Pure design-system governance.
 */
export const ACCENT_ACTIVE_CLASSES: Record<ModeAccent, string> = {
  blue: "border-primary/30 bg-primary/5 text-primary shadow-[0_0_0_3px_hsl(var(--primary) / 0.12)] dark:border-primary/40 dark:bg-primary/10 dark:text-primary dark:shadow-[0_0_0_3px_hsl(var(--primary) / 0.12)]",
  cyan: "border-cyan-7 bg-cyan-2 text-cyan-11 shadow-[0_0_0_3px_var(--cyan-3)] dark:border-cyan-7/60 dark:bg-cyan-2/25 dark:text-cyan-9 dark:shadow-[0_0_0_3px_rgba(11,241,195,0.12)]",
  green:
    "border-success/40 bg-success/10 text-[hsl(var(--success-strong))] shadow-[0_0_0_3px_var(--color-green-200)]",
  neutral:
    "border-neutral-8 bg-neutral-2 text-neutral-12 shadow-[0_0_0_3px_hsl(var(--muted))] dark:shadow-[0_0_0_3px_rgba(255,255,255,0.06)]",
};

export const ACCENT_ICON_CLASSES: Record<ModeAccent, string> = {
  blue: "text-primary",
  cyan: "text-cyan-9",
  green: "text-[hsl(var(--success-strong))]",
  neutral: "text-neutral-11",
};

interface CommandModeContextValue {
  mode: CommandMode;
  setMode: (next: CommandMode) => void;
  currentMeta: ModeMeta;
}

const CommandModeContext = createContext<CommandModeContextValue | null>(null);

export function CommandModeProvider({
  children,
  defaultMode = DEFAULT_MODE,
}: {
  children: ReactNode;
  defaultMode?: CommandMode;
}) {
  const [mode, setMode] = useState<CommandMode>(defaultMode);

  const value = useMemo<CommandModeContextValue>(() => {
    const currentMeta = MODES.find((m) => m.id === mode) ?? MODES[0];
    return { mode, setMode, currentMeta };
  }, [mode]);

  return <CommandModeContext.Provider value={value}>{children}</CommandModeContext.Provider>;
}

export function useCommandMode(): CommandModeContextValue {
  const ctx = useContext(CommandModeContext);
  if (!ctx) {
    throw new Error("useCommandMode must be used within a CommandModeProvider");
  }
  return ctx;
}
