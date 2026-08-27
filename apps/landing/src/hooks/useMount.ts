import { useSyncExternalStore } from "react";

/**
 * Returns true after component has mounted on the client.
 * Use to avoid hydration mismatches with theme-dependent rendering.
 */
export function useMount(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
