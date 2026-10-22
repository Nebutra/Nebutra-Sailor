/**
 * The "Catches" notes of a component page, collected for its Maintainers panel.
 *
 * Every example carries a sentence about the failure it exists to catch. That
 * is useful to whoever maintains the component and noise to everyone reading
 * the example, so the examples register their note here instead of rendering
 * it, and the Maintainers panel lists them in one place.
 *
 * A module-level store rather than props or context because the examples are
 * rendered by per-component demo modules the page loads dynamically, and in
 * Split mode the same example mounts twice — a keyed store counts both and
 * shows one.
 */

import type { ReactNode } from "react";

export interface CatchNote {
  /** The example's anchor id. */
  id: string;
  title: string;
  breaks: ReactNode;
}

interface Entry extends CatchNote {
  mounts: number;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
const EMPTY: readonly CatchNote[] = [];
let snapshot: readonly CatchNote[] = EMPTY;

function publish() {
  snapshot = [...entries.values()].map(({ id, title, breaks }) => ({ id, title, breaks }));
  for (const listener of listeners) listener();
}

/** Returns the function that withdraws this registration. */
export function registerCatch(note: CatchNote): () => void {
  const existing = entries.get(note.id);
  if (existing) {
    existing.mounts += 1;
  } else {
    entries.set(note.id, { ...note, mounts: 1 });
    publish();
  }

  return () => {
    const entry = entries.get(note.id);
    if (!entry) return;
    entry.mounts -= 1;
    if (entry.mounts <= 0) {
      entries.delete(note.id);
      publish();
    }
  };
}

export function subscribeCatches(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getCatches = (): readonly CatchNote[] => snapshot;
export const getServerCatches = (): readonly CatchNote[] => EMPTY;
