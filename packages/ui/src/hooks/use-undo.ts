"use client";

/**
 * Undo/Redo Hook
 *
 * History management for undo/redo functionality.
 *
 * Usage:
 * ```tsx
 * // Basic usage
 * const { state, set, undo, redo, canUndo, canRedo } = useUndo(initialValue);
 *
 * // With max history
 * const { state, set } = useUndo(initialValue, { maxHistory: 50 });
 *
 * // Complex object state
 * const { state, set, reset } = useUndo<FormData>({ name: "", email: "" });
 * ```
 */

import * as React from "react";

// ============================================================================
// Types
// ============================================================================

export interface UseUndoOptions {
  /** Maximum number of history entries */
  maxHistory?: number;
}

export interface UseUndoReturn<T> {
  /** Current state */
  state: T;
  /** Update state (adds to history) */
  set: (newState: T | ((prev: T) => T)) => void;
  /** Undo to previous state */
  undo: () => void;
  /** Redo to next state */
  redo: () => void;
  /** Reset to initial state (clears history) */
  reset: (newInitialState?: T) => void;
  /** Clear all history (keep current state) */
  clearHistory: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Number of undo steps available */
  undoCount: number;
  /** Number of redo steps available */
  redoCount: number;
  /** Full history (for debugging) */
  history: T[];
  /** Current position in history */
  historyIndex: number;
}

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

// ============================================================================
// Hook: useUndo
// ============================================================================

export function useUndo<T>(initialState: T, options: UseUndoOptions = {}): UseUndoReturn<T> {
  const { maxHistory = 100 } = options;

  const [history, setHistory] = React.useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const set = React.useCallback(
    (newState: T | ((prev: T) => T)) => {
      setHistory((prev) => {
        const nextState =
          typeof newState === "function" ? (newState as (prev: T) => T)(prev.present) : newState;

        // Don't add to history if state hasn't changed
        if (Object.is(nextState, prev.present)) {
          return prev;
        }

        // Limit history size
        const newPast = [...prev.past, prev.present].slice(-maxHistory);

        return {
          past: newPast,
          present: nextState,
          future: [], // Clear future on new change
        };
      });
    },
    [maxHistory],
  );

  const undo = React.useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;

      const newPast = prev.past.slice(0, -1);
      const previous = prev.past[prev.past.length - 1];

      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = React.useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const reset = React.useCallback(
    (newInitialState?: T) => {
      setHistory({
        past: [],
        present: newInitialState ?? initialState,
        future: [],
      });
    },
    [initialState],
  );

  const clearHistory = React.useCallback(() => {
    setHistory((prev) => ({
      past: [],
      present: prev.present,
      future: [],
    }));
  }, []);

  return {
    state: history.present,
    set,
    undo,
    redo,
    reset,
    clearHistory,
    canUndo,
    canRedo,
    undoCount: history.past.length,
    redoCount: history.future.length,
    history: [...history.past, history.present, ...history.future],
    historyIndex: history.past.length,
  };
}

// ============================================================================
// Hook: useUndoWithKeyboard
// ============================================================================

export interface UseUndoWithKeyboardOptions extends UseUndoOptions {
  /** Enable keyboard shortcuts (Ctrl/Cmd + Z, Ctrl/Cmd + Shift + Z) */
  enableKeyboard?: boolean;
}

export function useUndoWithKeyboard<T>(
  initialState: T,
  options: UseUndoWithKeyboardOptions = {},
): UseUndoReturn<T> {
  const { enableKeyboard = true, ...undoOptions } = options;
  const undoState = useUndo(initialState, undoOptions);

  React.useEffect(() => {
    if (!enableKeyboard) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && event.key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          undoState.redo();
        } else {
          undoState.undo();
        }
      }

      // Alternative redo: Ctrl/Cmd + Y
      if (modifier && event.key === "y") {
        event.preventDefault();
        undoState.redo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboard, undoState]);

  return undoState;
}

// ============================================================================
// Hook: useUndoReducer (for complex state)
// ============================================================================

export type UndoAction<T> =
  | { type: "SET"; payload: T }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET"; payload?: T }
  | { type: "CLEAR_HISTORY" };

function undoReducer<T>(state: HistoryState<T>, action: UndoAction<T>): HistoryState<T> {
  switch (action.type) {
    case "SET": {
      if (Object.is(action.payload, state.present)) {
        return state;
      }
      return {
        past: [...state.past, state.present],
        present: action.payload,
        future: [],
      };
    }
    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
    case "RESET": {
      return {
        past: [],
        present: action.payload ?? state.present,
        future: [],
      };
    }
    case "CLEAR_HISTORY": {
      return {
        past: [],
        present: state.present,
        future: [],
      };
    }
    default:
      return state;
  }
}

export function useUndoReducer<T>(initialState: T) {
  const [state, dispatch] = React.useReducer(undoReducer<T>, {
    past: [],
    present: initialState,
    future: [],
  });

  const actions = React.useMemo(
    () => ({
      set: (value: T) => dispatch({ type: "SET" as const, payload: value }),
      undo: () => dispatch({ type: "UNDO" as const }),
      redo: () => dispatch({ type: "REDO" as const }),
      reset: (value?: T) => dispatch({ type: "RESET" as const, payload: value }),
      clearHistory: () => dispatch({ type: "CLEAR_HISTORY" as const }),
    }),
    [],
  );

  return {
    state: state.present,
    ...actions,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    undoCount: state.past.length,
    redoCount: state.future.length,
  };
}
