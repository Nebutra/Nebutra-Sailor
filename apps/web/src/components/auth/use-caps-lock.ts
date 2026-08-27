"use client";

import { useCallback, useState } from "react";

/**
 * Detects when Caps Lock is engaged while typing inside a password field.
 *
 * Returns `{ capsLockOn, onKeyEvent }` — bind `onKeyEvent` to both
 * `onKeyDown` and `onKeyUp` on the input. We update state on every key event
 * because the browser only tells us `getModifierState("CapsLock")` in
 * response to a key — there is no DOM event for the lock toggling on its
 * own.
 */
export function useCapsLock(): {
  capsLockOn: boolean;
  onKeyEvent: (event: React.KeyboardEvent<HTMLInputElement>) => void;
} {
  const [capsLockOn, setCapsLockOn] = useState(false);

  const onKeyEvent = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof event.getModifierState !== "function") return;
    const active = event.getModifierState("CapsLock");
    setCapsLockOn((prev) => (prev === active ? prev : active));
  }, []);

  return { capsLockOn, onKeyEvent };
}
