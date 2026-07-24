"use client";

import {
  type MarketingAnimationScope,
  prefersReducedMarketingMotion,
  registerMarketingGsap,
  useGSAP,
} from "../helpers/runtime";

type ContextSafe = <T extends (...args: unknown[]) => unknown>(callback: T) => T;

export type MarketingGsapCallback = (
  context: gsap.Context,
  contextSafe?: ContextSafe,
) => undefined | (() => void);

export interface UseMarketingGsapOptions {
  scope?: MarketingAnimationScope;
  dependencies?: unknown[];
  revertOnUpdate?: boolean;
  allowReducedMotion?: boolean;
}

export function useMarketingGsap(
  callback: MarketingGsapCallback,
  {
    allowReducedMotion = false,
    dependencies,
    revertOnUpdate = true,
    scope,
  }: UseMarketingGsapOptions = {},
) {
  registerMarketingGsap();

  return useGSAP(
    (context, contextSafe) => {
      if (!allowReducedMotion && prefersReducedMarketingMotion()) return;
      return callback(context, contextSafe as ContextSafe | undefined);
    },
    {
      dependencies,
      revertOnUpdate,
      scope,
    },
  );
}
