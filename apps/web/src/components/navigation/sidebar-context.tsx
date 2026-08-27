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

const COOKIE_NAME = "nebutra-sidebar-collapsed";
const COOKIE_MAX_AGE_SECONDS = 31_536_000; // 1 year

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readInitialCollapsed(): boolean {
  if (typeof document === "undefined") return false;
  const match = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${COOKIE_NAME}=`));
  if (!match) return false;
  const value = match.slice(COOKIE_NAME.length + 1);
  return value === "1";
}

function writeCookie(collapsed: boolean): void {
  if (typeof document === "undefined") return;
  const value = collapsed ? "1" : "0";
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

interface SidebarProviderProps {
  children: ReactNode;
  /**
   * Optional override for SSR-provided initial state. When provided, the
   * provider trusts this value over reading the cookie at mount time. Useful
   * if the server has already parsed the cookie and wants to avoid hydration
   * flicker.
   */
  initialCollapsed?: boolean;
}

export function SidebarProvider({ children, initialCollapsed }: SidebarProviderProps) {
  const [collapsed, setCollapsedState] = useState<boolean>(() => initialCollapsed ?? false);

  // Hydrate from cookie on mount when no SSR override was provided.
  useEffect(() => {
    if (initialCollapsed !== undefined) return;
    const fromCookie = readInitialCollapsed();
    if (fromCookie) setCollapsedState(true);
    // We only run this on mount; subsequent state changes own the cookie.
  }, [initialCollapsed]);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    writeCookie(value);
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((previous) => {
      const next = !previous;
      writeCookie(next);
      return next;
    });
  }, []);

  // Cmd+B / Ctrl+B keyboard shortcut.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isB = event.key === "b" || event.key === "B";
      if (!isB) return;
      if (!event.metaKey && !event.ctrlKey) return;
      // Skip when the user is typing in a form control.
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      toggle();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [toggle]);

  const value = useMemo<SidebarContextValue>(
    () => ({ collapsed, toggle, setCollapsed }),
    [collapsed, toggle, setCollapsed],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return ctx;
}
