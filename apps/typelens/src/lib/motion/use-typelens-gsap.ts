"use client";

import type { RefObject } from "react";
import { prefersReducedTypeLensMotion, registerTypeLensGsap, useGSAP } from "./runtime";

type ContextSafe = <T extends (...args: never[]) => unknown>(callback: T) => T;

export type TypeLensGsapCallback = (
  context: gsap.Context,
  contextSafe?: ContextSafe,
) => void | (() => void);

type TypeLensGsapOptions = {
  scope?: RefObject<Element | null>;
  dependencies?: unknown[];
  revertOnUpdate?: boolean;
  /** When true, still run (e.g. simple opacity) under reduced motion */
  allowReducedMotion?: boolean;
};

/**
 * Thin wrapper over useGSAP (gsap-react skill):
 * - register plugins once
 * - skip motion when prefers-reduced-motion (unless allowReducedMotion)
 * - scope + automatic revert on unmount
 */
export function useTypeLensGsap(callback: TypeLensGsapCallback, options: TypeLensGsapOptions = {}) {
  registerTypeLensGsap();

  const { scope, dependencies = [], revertOnUpdate = true, allowReducedMotion = false } = options;

  const config: {
    scope?: RefObject<Element | null>;
    dependencies: unknown[];
    revertOnUpdate: boolean;
  } = {
    dependencies,
    revertOnUpdate,
  };
  if (scope) {
    config.scope = scope;
  }

  return useGSAP((context, contextSafe) => {
    if (!allowReducedMotion && prefersReducedTypeLensMotion()) return;
    return callback(context, contextSafe as ContextSafe | undefined);
  }, config);
}
