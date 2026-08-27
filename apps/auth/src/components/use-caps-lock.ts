"use client";

import { useCallback, useState } from "react";

/**
 * Detects Caps Lock while typing in a password field.
 * Bind `onKeyEvent` to both onKeyDown and onKeyUp.
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
