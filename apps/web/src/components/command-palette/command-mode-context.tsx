"use client";

import {
  Database,
  type Icon as LucideIcon,
  Message as MessageSquare,
  MagnifyingGlass as Search,
  Workflow,
} from "@nebutra/icons";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

export type CommandMode = "chat" | "data" | "workflow" | "search";

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
    id: "chat",
    label: "Chat",
    icon: MessageSquare,
    placeholder: "Ask Sailor anything…",
    description: "Open a Sailor AI chat session",
    accent: "blue",
    destination: "/chat",
  },
  {
    id: "data",
    label: "Data",
    icon: Database,
    placeholder: "Inspect events, conversions, or revenue…",
    description: "Open analytics for this workspace",
    accent: "cyan",
    destination: "/analytics",
  },
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

const DEFAULT_MODE: CommandMode = "chat";

/**
 * Statically resolvable accent classes so Tailwind retains them.
 * Each mode owns its own surface palette via our scale tokens — no
 * raw hex, no off-system accents. Pure design-system governance.
 */
export const ACCENT_ACTIVE_CLASSES: Record<ModeAccent, string> = {
  blue: "border-blue-7 bg-blue-2 text-blue-11 shadow-[0_0_0_3px_var(--blue-3)] dark:border-blue-7/60 dark:bg-blue-2/25 dark:text-blue-9 dark:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]",
  cyan: "border-cyan-7 bg-cyan-2 text-cyan-11 shadow-[0_0_0_3px_var(--cyan-3)] dark:border-cyan-7/60 dark:bg-cyan-2/25 dark:text-cyan-9 dark:shadow-[0_0_0_3px_rgba(11,241,195,0.12)]",
  green:
    "border-green-7 bg-green-2 text-green-11 shadow-[0_0_0_3px_var(--green-3)] dark:border-green-7/60 dark:bg-green-2/25 dark:text-green-9 dark:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]",
  neutral:
    "border-neutral-8 bg-neutral-2 text-neutral-12 shadow-[0_0_0_3px_var(--neutral-3)] dark:border-white/30 dark:bg-white/10 dark:text-white dark:shadow-[0_0_0_3px_rgba(255,255,255,0.06)]",
};

export const ACCENT_ICON_CLASSES: Record<ModeAccent, string> = {
  blue: "text-blue-9",
  cyan: "text-cyan-9",
  green: "text-green-9",
  neutral: "text-neutral-11 dark:text-white/70",
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
