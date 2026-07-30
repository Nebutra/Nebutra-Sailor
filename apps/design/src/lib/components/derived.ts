/**
 * The shape the server passes into a demo: everything about a component that
 * was read out of the library source rather than typed into this app.
 */

import type { CvaSpec } from "./ui-source";

export interface Derived {
  /** cva variant maps, keyed by the `as` name from the registry entry. */
  cva: Record<string, CvaSpec>;
  /** Non-cva axes (size unions, tone maps), keyed by the `as` name. */
  axes: Record<string, string[]>;
  /** Repo-relative source file. */
  sourceFile: string;
  /** Repo-relative colocated story, when one exists. */
  storyFile: string | null;
}

export interface DemoProps {
  derived: Derived;
}

/** Read a cva axis with a stated fallback of "not declared in source". */
export function axis(derived: Derived, cvaKey: string, group: string): string[] {
  return derived.cva[cvaKey]?.variants[group] ?? [];
}

export function axisDefault(derived: Derived, cvaKey: string, group: string): string | undefined {
  return derived.cva[cvaKey]?.defaults[group];
}
