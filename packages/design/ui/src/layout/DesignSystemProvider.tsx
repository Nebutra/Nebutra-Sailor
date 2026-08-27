"use client";

import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ThemeMode } from "../theme";

// ============================================
// Context
// ============================================

interface DesignSystemContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  resolvedMode: "light" | "dark";
}

const DesignSystemContext = createContext<DesignSystemContextValue | null>(null);

// ============================================
// Hook
// ============================================

export function useDesignSystem() {
  const context = useContext(DesignSystemContext);
  if (!context) {
    throw new Error("useDesignSystem must be used within DesignSystemProvider");
  }
  return context;
}

// ============================================
// Provider Props
// ============================================

export interface DesignSystemProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  storageKey?: string;
  enableSystemPreference?: boolean;
}

// ============================================
// Provider Component
// ============================================

export function DesignSystemProvider({
  children,
  defaultMode = "system",
  storageKey = "nebutra-theme-mode",
  enableSystemPreference = true,
}: DesignSystemProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [systemPreference, setSystemPreference] = useState<"light" | "dark">("light");

  // Detect system preference
  useEffect(() => {
    if (typeof window === "undefined" || !enableSystemPreference) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemPreference(mediaQuery.matches ? "dark" : "light");

    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [enableSystemPreference]);

  // Load from storage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(storageKey);
    if (stored && ["light", "dark", "system"].includes(stored)) {
      setModeState(stored as ThemeMode);
    }
  }, [storageKey]);

  // Resolve actual mode
  const resolvedMode = useMemo((): "light" | "dark" => {
    if (mode === "system") {
      return systemPreference;
    }
    return mode;
  }, [mode, systemPreference]);

  // Set mode with persistence
  const setMode = useCallback(
    (newMode: ThemeMode) => {
      setModeState(newMode);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, newMode);
      }
    },
    [storageKey],
  );

  // Toggle between light and dark
  const toggleMode = useCallback(() => {
    setMode(resolvedMode === "light" ? "dark" : "light");
  }, [resolvedMode, setMode]);

  // Context value
  const contextValue = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode,
      resolvedMode,
    }),
    [mode, resolvedMode, setMode, toggleMode],
  );

  return (
    <DesignSystemContext.Provider value={contextValue}>{children}</DesignSystemContext.Provider>
  );
}
