"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

export const SIDEBAR_EXPANSION_STORAGE_KEY = "nebutra_sidebar_expansion";

type SidebarExpansionStore = {
  map: Record<string, boolean>;
  setOpen: (id: string, open: boolean) => void;
  toggle: (id: string) => void;
  hasRestored: () => boolean;
};

export const useSidebarExpansionStore = create<SidebarExpansionStore>()(
  persist(
    (set, get) => ({
      map: {},
      setOpen: (id, open) => set({ map: { ...get().map, [id]: open } }),
      toggle: (id) => set({ map: { ...get().map, [id]: !get().map[id] } }),
      // True when any persisted group is open — drives the restored-groups toast.
      hasRestored: () => Object.values(get().map).some((v) => v),
    }),
    {
      name: SIDEBAR_EXPANSION_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ map }) => ({ map }),
      // SSR-safe: the shell calls .persist.rehydrate() once on mount so the
      // server and first client render agree on an empty map (no flash).
      skipHydration: true,
    },
  ),
);

type SidebarExpansionSelection = {
  map: Record<string, boolean>;
  setOpen: SidebarExpansionStore["setOpen"];
  toggle: SidebarExpansionStore["toggle"];
};

/**
 * Hook returning the expansion map plus stable action references. `map` is
 * shallow-memoized so consumers only re-render when an entry actually changes.
 */
export function useSidebarExpansion(): SidebarExpansionSelection {
  return useSidebarExpansionStore(
    useShallow((s) => ({ map: s.map, setOpen: s.setOpen, toggle: s.toggle })),
  );
}
