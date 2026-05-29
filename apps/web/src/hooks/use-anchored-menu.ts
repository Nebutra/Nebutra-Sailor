"use client";

import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Anchors a popover menu to a trigger via a fixed-position portal so it escapes
 * any `overflow:hidden` ancestor (e.g. the collapsible sidebar) and opens
 * upward — the correct direction for controls docked at the bottom of the rail.
 *
 * Returns refs for the trigger and the (portaled) menu plus a `fixed` style.
 * Outside-click and Escape both call `onClose`; clicks inside the trigger or
 * menu are ignored so menu-item clicks still register.
 */
export function useAnchoredMenu(open: boolean, onClose: () => void) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<CSSProperties>({ position: "fixed", visibility: "hidden" });

  useLayoutEffect(() => {
    if (!open) return;
    function reposition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setStyle({
        position: "fixed",
        left: Math.round(rect.left),
        bottom: Math.round(window.innerHeight - rect.top + 6),
        zIndex: 60,
      });
    }
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return { triggerRef, menuRef, style };
}
