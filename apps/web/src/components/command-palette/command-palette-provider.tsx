"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CommandDefinition } from "./commands";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** Dynamic commands registered at runtime by feature components. */
  dynamicCommands: ReadonlyArray<CommandDefinition>;
  registerCommand: (command: CommandDefinition) => () => void;
  unregisterCommand: (id: string) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

interface CommandPaletteProviderProps {
  children: ReactNode;
  /** When true, disables the global ⌘K / Ctrl+K listener (useful for tests). */
  disableShortcut?: boolean;
}

/**
 * Detects the cmd+K (mac) / ctrl+K (others) shortcut.
 * Exported for unit testing.
 */
export function isCommandPaletteShortcut(event: KeyboardEvent): boolean {
  const isModKey = event.metaKey || event.ctrlKey;
  return isModKey && event.key.toLowerCase() === "k";
}

export function CommandPaletteProvider({
  children,
  disableShortcut = false,
}: CommandPaletteProviderProps) {
  const [open, setOpenState] = useState(false);
  const [dynamicCommands, setDynamicCommands] = useState<CommandDefinition[]>([]);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
  }, []);

  const toggle = useCallback(() => {
    setOpenState((prev) => !prev);
  }, []);

  const registerCommand = useCallback((command: CommandDefinition) => {
    setDynamicCommands((prev) => {
      // Replace if id collides — last writer wins, immutably.
      const filtered = prev.filter((c) => c.id !== command.id);
      return [...filtered, command];
    });
    return () => {
      setDynamicCommands((prev) => prev.filter((c) => c.id !== command.id));
    };
  }, []);

  const unregisterCommand = useCallback((id: string) => {
    setDynamicCommands((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Global ⌘+K / Ctrl+K shortcut. Fires regardless of focus target —
  // command palette is a global navigator, so it must override input focus.
  useEffect(() => {
    if (disableShortcut) return;

    const handler = (event: KeyboardEvent) => {
      if (isCommandPaletteShortcut(event)) {
        event.preventDefault();
        setOpenState((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disableShortcut]);

  const value = useMemo<CommandPaletteContextValue>(
    () => ({
      open,
      setOpen,
      toggle,
      dynamicCommands,
      registerCommand,
      unregisterCommand,
    }),
    [open, setOpen, toggle, dynamicCommands, registerCommand, unregisterCommand],
  );

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

/** Access the command palette context. Throws when used outside the provider. */
export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
  }
  return ctx;
}
