"use client";

import type {
  GlobalOptions as ConfettiGlobalOptions,
  CreateTypes as ConfettiInstance,
  Options as ConfettiOptions,
} from "canvas-confetti";
import confetti from "canvas-confetti";
import type React from "react";
import type { ReactNode } from "react";
import {
  createContext,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { cn } from "../utils";
import { Button } from "./button";

// =============================================================================
// Types
// =============================================================================

/**
 * API exposed via ref
 */
export type ConfettiApi = {
  /** Fire confetti with optional overrides */
  fire: (options?: ConfettiOptions) => Promise<void>;
};

export type ConfettiRef = ConfettiApi | null;

/**
 * Props for Confetti canvas component
 *
 * @description
 * Canvas-based confetti animation wrapper using canvas-confetti library.
 * Supports auto-fire on mount or manual control via ref.
 *
 * **UX Scenarios:**
 * - Purchase/checkout success celebrations
 * - Achievement unlocks
 * - Form submission success
 * - Game win states
 * - Milestone celebrations
 *
 * **Features:**
 * - Web Worker support for performance
 * - Auto-resize canvas
 * - Ref-based imperative control
 * - Context provider for nested triggers
 */
export interface ConfettiProps extends React.ComponentPropsWithRef<"canvas"> {
  /** Confetti animation options */
  options?: ConfettiOptions;
  /** Global canvas-confetti options */
  globalOptions?: ConfettiGlobalOptions;
  /**
   * Whether to wait for manual fire() call
   * @default false
   */
  manualstart?: boolean;
  /** Content to render (can access fire via context) */
  children?: ReactNode;
}

/**
 * Props for ConfettiButton component
 */
export interface ConfettiButtonProps extends React.ComponentProps<typeof Button> {
  /** Confetti options merged with position origin */
  options?: ConfettiOptions & ConfettiGlobalOptions & { canvas?: HTMLCanvasElement };
}

// =============================================================================
// Context
// =============================================================================

const ConfettiContext = createContext<ConfettiApi>({} as ConfettiApi);

// =============================================================================
// Confetti Component
// =============================================================================

/**
 * Confetti - Canvas confetti animation
 *
 * @example
 * ```tsx
 * // Auto-fire on mount
 * <Confetti className="fixed inset-0 pointer-events-none" />
 *
 * // Manual control via ref
 * const confettiRef = useRef<ConfettiRef>(null);
 * <Confetti ref={confettiRef} manualstart />
 * <button onClick={() => confettiRef.current?.fire()}>
 *   Celebrate!
 * </button>
 *
 * // Custom options
 * <Confetti
 *   options={{
 *     particleCount: 100,
 *     spread: 70,
 *     colors: ['#ff0000', '#00ff00', '#0000ff']
 *   }}
 * />
 * ```
 */
export const Confetti = forwardRef<ConfettiRef, ConfettiProps>((props, ref) => {
  const {
    options,
    globalOptions = { resize: true, useWorker: true },
    manualstart = false,
    children,
    className,
    ...rest
  } = props;

  const instanceRef = useRef<ConfettiInstance | null>(null);

  const canvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (node !== null) {
        if (instanceRef.current) return;
        instanceRef.current = confetti.create(node, {
          ...globalOptions,
          resize: true,
        });
      } else {
        if (instanceRef.current) {
          instanceRef.current.reset();
          instanceRef.current = null;
        }
      }
    },
    [globalOptions],
  );

  const fire = useCallback(
    async (opts: ConfettiOptions = {}) => {
      try {
        await instanceRef.current?.({ ...options, ...opts });
      } catch (_error) {}
    },
    [options],
  );

  const api = useMemo(() => ({ fire }), [fire]);

  useImperativeHandle(ref, () => api, [api]);

  useEffect(() => {
    if (!manualstart) {
      fire().catch(console.error);
    }
  }, [manualstart, fire]);

  return (
    <ConfettiContext.Provider value={api}>
      <canvas ref={canvasRef} className={cn("pointer-events-none", className)} {...rest} />
      {children}
    </ConfettiContext.Provider>
  );
});

Confetti.displayName = "Confetti";

// =============================================================================
// ConfettiButton Component
// =============================================================================

/**
 * ConfettiButton - Button that fires confetti from its position
 *
 * @example
 * ```tsx
 * <ConfettiButton>
 *   🎉 Celebrate!
 * </ConfettiButton>
 *
 * <ConfettiButton
 *   options={{
 *     particleCount: 50,
 *     spread: 60,
 *     colors: ['#FFD700', '#FFA500']
 *   }}
 * >
 *   Win!
 * </ConfettiButton>
 * ```
 */
export const ConfettiButton: React.FC<ConfettiButtonProps> = ({
  options,
  children,
  onClick,
  ...props
}) => {
  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      await confetti({
        ...options,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
      });

      // Call original onClick if provided
      onClick?.(event);
    } catch (_error) {}
  };

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
};

ConfettiButton.displayName = "ConfettiButton";

export default Confetti;
