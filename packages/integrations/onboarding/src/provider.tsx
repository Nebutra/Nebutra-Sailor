"use client";

import { type Driver, driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Tour, TourController } from "./types";

const STORAGE_PREFIX = "nebutra_tour_completed:";

function readCompleted(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const set = new Set<string>();
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        set.add(key.slice(STORAGE_PREFIX.length));
      }
    }
  } catch {
    // localStorage may be disabled — leave the set empty.
  }
  return set;
}

function markCompleted(id: string) {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${id}`, "1");
  } catch {
    // ignore
  }
}

function clearCompleted(id: string) {
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
  } catch {
    // ignore
  }
}

const OnboardingContext = createContext<TourController | null>(null);

interface OnboardingProviderProps {
  children: ReactNode;
  /** Optional callback fired when a tour reaches its final step. */
  onComplete?: (tourId: string) => void;
  /** Optional callback fired whenever the active step changes. */
  onStepChange?: (tourId: string, stepId: string, stepIndex: number) => void;
}

/**
 * OnboardingProvider — single mount that wires `driver.js` to React state.
 *
 * Place ONCE inside the app's authenticated layout (above any consumer of
 * `useTour()`). Multiple providers in the tree are an anti-pattern — the
 * outermost wins.
 */
export function OnboardingProvider({
  children,
  onComplete,
  onStepChange,
}: OnboardingProviderProps) {
  const driverRef = useRef<Driver | null>(null);
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());

  // Hydrate completion state from localStorage on mount.
  useEffect(() => {
    setCompleted(readCompleted());
  }, []);

  // Tear down driver instance on unmount.
  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, []);

  const finalize = useCallback(
    (tour: Tour) => {
      markCompleted(tour.id);
      setCompleted((prev) => {
        const next = new Set(prev);
        next.add(tour.id);
        return next;
      });
      setActiveTour(null);
      driverRef.current?.destroy();
      driverRef.current = null;
      onComplete?.(tour.id);
    },
    [onComplete],
  );

  const start = useCallback<TourController["start"]>(
    (tour) => {
      // Destroy any previous instance.
      driverRef.current?.destroy();

      const instance = driver({
        showProgress: true,
        showButtons: ["next", "previous", "close"],
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: tour.doneLabel ?? "Done",
        progressText: "{{current}} / {{total}}",
        // Disable native click on the highlighted element — users can click
        // Next / Esc instead. Prevents accidental flow exits.
        allowClose: true,
        // popoverClass and overlayColor are themed via styles.css (token-driven).
        steps: tour.steps.map((step, index) => ({
          element: step.target,
          popover: {
            title: step.title,
            description: step.description,
            // Only include `side`/`align` when defined — driver.js's types
            // refuse `undefined` under exactOptionalPropertyTypes.
            ...(step.side && step.side !== "over" ? { side: step.side } : {}),
            ...(step.align ? { align: step.align } : {}),
            onPopoverRender: () => {
              onStepChange?.(tour.id, step.id, index);
            },
          },
        })),
        onDestroyStarted: () => {
          // User pressed Esc / clicked overlay → treat as abort.
          driverRef.current?.destroy();
          driverRef.current = null;
          setActiveTour(null);
        },
        onDestroyed: () => {
          // If we reached the last step and clicked Done, mark complete.
          // `driver.js` doesn't expose a "completed" signal — use index check.
          if (driverRef.current && driverRef.current.isLastStep?.()) {
            finalize(tour);
          }
        },
      });

      driverRef.current = instance;
      setActiveTour(tour);
      instance.drive();
    },
    [finalize, onStepChange],
  );

  const next = useCallback(() => driverRef.current?.moveNext(), []);
  const previous = useCallback(() => driverRef.current?.movePrevious(), []);

  const abort = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = null;
    setActiveTour(null);
  }, []);

  const complete = useCallback(() => {
    if (activeTour) finalize(activeTour);
  }, [activeTour, finalize]);

  const isCompleted = useCallback<TourController["isCompleted"]>(
    (tourId) => completed.has(tourId),
    [completed],
  );

  const reset = useCallback<TourController["reset"]>((tourId) => {
    clearCompleted(tourId);
    setCompleted((prev) => {
      const next = new Set(prev);
      next.delete(tourId);
      return next;
    });
  }, []);

  const value = useMemo<TourController>(
    () => ({ start, next, previous, abort, complete, isCompleted, reset }),
    [start, next, previous, abort, complete, isCompleted, reset],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useTour(): TourController {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useTour must be used within an OnboardingProvider");
  }
  return ctx;
}
