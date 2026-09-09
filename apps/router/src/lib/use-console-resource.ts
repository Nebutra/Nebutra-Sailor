"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRequestLane, describeError, isAbortError } from "@/lib/console-client";

/**
 * One remote read, with the four states the console is required to render.
 *
 * The states are exclusive on purpose. Before this hook the console had one
 * `loading` boolean and a bare array, which cannot express "the request failed"
 * — so a failure fell through to the empty branch and the page said the
 * customer had no keys, no usage and no money. `status` here is a single
 * discriminant: `loading | ready | error`, and "empty" is a property of the
 * loaded data, never a substitute for an error.
 *
 * Every load runs in a {@link createRequestLane}, so switching a filter twice
 * cancels the first request instead of racing it.
 */
export type ConsoleResource<T> =
  | { status: "loading"; data: T | null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "error"; data: T | null; error: string };

export interface ConsoleResourceHandle<T> {
  resource: ConsoleResource<T>;
  /** Re-run the current load. Used by the retry button in every error panel. */
  reload: () => void;
  /**
   * Replace the loaded value without a round trip — the optimistic half of an
   * optimistic update. Rolling back is the same call with the previous value.
   */
  set: (next: T) => void;
}

/**
 * @param key   Changing it starts a fresh load and cancels the previous one.
 *              Build it from whatever the load depends on (the URL filters).
 * @param load  Receives the lane's signal; must pass it to the fetch.
 */
export function useConsoleResource<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
): ConsoleResourceHandle<T> {
  const [resource, setResource] = useState<ConsoleResource<T>>({
    status: "loading",
    data: null,
    error: null,
  });
  const [nonce, setNonce] = useState(0);

  // The loader is a fresh closure on every render; keeping it in a ref lets the
  // effect depend on `key` alone instead of re-firing on each render.
  const loadRef = useRef(load);
  loadRef.current = load;

  // biome-ignore lint/correctness/useExhaustiveDependencies: the loader is held in a ref on purpose; `key` and `nonce` are the only things that should restart a load
  useEffect(() => {
    const lane = createRequestLane();
    let live = true;
    setResource((previous) => ({ status: "loading", data: previous.data, error: null }));

    loadRef
      .current(lane.next())
      .then((data) => {
        if (live) setResource({ status: "ready", data, error: null });
      })
      .catch((error: unknown) => {
        // An abort means a newer load owns the state now. Writing an error here
        // would paint a failure over a request that is still in flight.
        if (!live || isAbortError(error)) return;
        setResource((previous) => ({
          status: "error",
          data: previous.data,
          error: describeError(error),
        }));
      });

    return () => {
      live = false;
      lane.cancel();
    };
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  const set = useCallback((next: T) => {
    setResource({ status: "ready", data: next, error: null });
  }, []);

  return { resource, reload, set };
}
