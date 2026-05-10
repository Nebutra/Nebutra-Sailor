"use client";

/**
 * Focus Trap Hook
 *
 * Accessibility utilities for focus management in modals and dialogs.
 *
 * Usage:
 * ```tsx
 * // Basic focus trap
 * const { containerRef } = useFocusTrap({ enabled: isOpen });
 * <div ref={containerRef}>...</div>
 *
 * // With initial focus
 * const { containerRef } = useFocusTrap({
 *   enabled: isOpen,
 *   initialFocusRef: inputRef,
 * });
 *
 * // Return focus on close
 * const { containerRef } = useFocusTrap({
 *   enabled: isOpen,
 *   returnFocusOnDeactivate: true,
 * });
 * ```
 */

import * as React from "react";

// ============================================================================
// Types
// ============================================================================

export interface UseFocusTrapOptions {
  /** Whether the focus trap is enabled */
  enabled?: boolean;
  /** Ref to element that should receive initial focus */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Return focus to previously focused element on deactivate */
  returnFocusOnDeactivate?: boolean;
  /** Allow focus to escape the trap (for nested modals) */
  allowOutsideFocus?: boolean;
  /** Callback when escape key is pressed */
  onEscape?: () => void;
}

export interface UseFocusTrapReturn {
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Manually activate the trap */
  activate: () => void;
  /** Manually deactivate the trap */
  deactivate: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "area[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable]",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

// ============================================================================
// Hook: useFocusTrap
// ============================================================================

export function useFocusTrap(options: UseFocusTrapOptions = {}): UseFocusTrapReturn {
  const {
    enabled = true,
    initialFocusRef,
    returnFocusOnDeactivate = true,
    allowOutsideFocus = false,
    onEscape,
  } = options;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  const getFocusableElements = React.useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    const elements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    return Array.from(elements).filter(
      (el) => el.offsetParent !== null, // Filter out hidden elements
    );
  }, []);

  const activate = React.useCallback(() => {
    // Store currently focused element
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // Focus initial element or first focusable
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        // Focus container if no focusable elements
        containerRef.current?.focus();
      }
    }
  }, [initialFocusRef, getFocusableElements]);

  const deactivate = React.useCallback(() => {
    if (returnFocusOnDeactivate && previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
    }
  }, [returnFocusOnDeactivate]);

  // Handle Tab key navigation
  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current) return;

      // Handle Escape
      if (event.key === "Escape") {
        onEscape?.();
        return;
      }

      // Handle Tab
      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift + Tab on first element -> go to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab on last element -> go to first
      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, getFocusableElements, onEscape]);

  // Handle focus outside container
  React.useEffect(() => {
    if (!enabled || allowOutsideFocus) return;

    const handleFocusIn = (event: FocusEvent) => {
      if (!containerRef.current) return;

      const target = event.target as Node;
      if (!containerRef.current.contains(target)) {
        // Focus escaped, bring it back
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, [enabled, allowOutsideFocus, getFocusableElements]);

  // Activate/deactivate based on enabled state
  React.useEffect(() => {
    if (enabled) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(activate, 0);
      return () => clearTimeout(timer);
    } else {
      deactivate();
    }
  }, [enabled, activate, deactivate]);

  return {
    containerRef,
    activate,
    deactivate,
  };
}

// ============================================================================
// Hook: useFocusOnMount
// ============================================================================

export interface UseFocusOnMountOptions {
  /** Ref to element that should receive focus */
  ref: React.RefObject<HTMLElement>;
  /** Delay before focusing (ms) */
  delay?: number;
  /** Whether to focus */
  enabled?: boolean;
}

export function useFocusOnMount({ ref, delay = 0, enabled = true }: UseFocusOnMountOptions): void {
  React.useEffect(() => {
    if (!enabled || !ref.current) return;

    const timer = setTimeout(() => {
      ref.current?.focus();
    }, delay);

    return () => clearTimeout(timer);
  }, [ref, delay, enabled]);
}

// ============================================================================
// Hook: useFocusReturn
// ============================================================================

/**
 * Returns focus to previously focused element on unmount
 */
export function useFocusReturn(enabled = true): void {
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!enabled) return;

    // Store currently focused element on mount
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // Return focus on unmount
    return () => {
      if (previouslyFocusedRef.current?.focus) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [enabled]);
}

// ============================================================================
// Hook: useArrowNavigation
// ============================================================================

export interface UseArrowNavigationOptions {
  /** Container ref */
  containerRef: React.RefObject<HTMLElement>;
  /** Selector for navigable items */
  itemSelector?: string;
  /** Enable wrap-around */
  loop?: boolean;
  /** Orientation */
  orientation?: "horizontal" | "vertical" | "both";
  /** Whether enabled */
  enabled?: boolean;
}

export function useArrowNavigation({
  containerRef,
  itemSelector = "[role='menuitem'], [role='option'], button, a",
  loop = true,
  orientation = "vertical",
  enabled = true,
}: UseArrowNavigationOptions): void {
  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current) return;

      const items = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(itemSelector),
      ).filter((el) => el.offsetParent !== null);

      if (items.length === 0) return;

      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      let nextIndex: number | null = null;

      const isVertical = orientation === "vertical" || orientation === "both";
      const isHorizontal = orientation === "horizontal" || orientation === "both";

      if (
        (event.key === "ArrowDown" && isVertical) ||
        (event.key === "ArrowRight" && isHorizontal)
      ) {
        event.preventDefault();
        if (currentIndex === -1) {
          nextIndex = 0;
        } else if (currentIndex < items.length - 1) {
          nextIndex = currentIndex + 1;
        } else if (loop) {
          nextIndex = 0;
        }
      } else if (
        (event.key === "ArrowUp" && isVertical) ||
        (event.key === "ArrowLeft" && isHorizontal)
      ) {
        event.preventDefault();
        if (currentIndex === -1) {
          nextIndex = items.length - 1;
        } else if (currentIndex > 0) {
          nextIndex = currentIndex - 1;
        } else if (loop) {
          nextIndex = items.length - 1;
        }
      } else if (event.key === "Home") {
        event.preventDefault();
        nextIndex = 0;
      } else if (event.key === "End") {
        event.preventDefault();
        nextIndex = items.length - 1;
      }

      if (nextIndex !== null) {
        items[nextIndex].focus();
      }
    };

    const container = containerRef.current;
    container?.addEventListener("keydown", handleKeyDown);
    return () => container?.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, itemSelector, loop, orientation, enabled]);
}
