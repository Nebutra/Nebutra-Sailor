"use client";

import type { ReactNode } from "react";

export type PlanTier = "free" | "starter" | "pro" | "enterprise" | (string & {});

export interface FeatureGateProps {
  /** The user's current plan tier, read from billing. */
  currentPlan: PlanTier;
  /** Plan tiers that unlock the children. */
  requires: ReadonlyArray<PlanTier>;
  /** Content rendered when `currentPlan` satisfies `requires`. */
  children: ReactNode;
  /**
   * Fallback rendered when the gate is closed. Typically `<UpgradeBanner>`.
   * When omitted, the gate renders nothing (silent gate).
   */
  fallback?: ReactNode;
}

/**
 * FeatureGate — declarative plan-tier gate.
 *
 * Pure presentational primitive. The caller passes the user's current plan
 * (read from `@nebutra/billing` upstream). No context provider is required,
 * which keeps the gate composable across server and client boundaries.
 *
 * The unicorn-validated pattern from Linear / Notion: never hard-route block
 * — show the value behind the gate, fade it, surface an inline upsell, let
 * the user opt-in to upgrade without losing place.
 *
 * @example
 * ```tsx
 * <FeatureGate
 *   currentPlan={org.plan}
 *   requires={["pro", "enterprise"]}
 *   fallback={<UpgradeBanner feature="Custom workflows" />}
 * >
 *   <WorkflowEditor />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({ currentPlan, requires, children, fallback }: FeatureGateProps) {
  const unlocked = requires.includes(currentPlan);
  if (unlocked) return <>{children}</>;
  return <>{fallback ?? null}</>;
}

/**
 * Hook variant — for cases where conditional rendering needs surrounding logic.
 */
export function useFeatureGate(
  currentPlan: PlanTier,
  requires: ReadonlyArray<PlanTier>,
): { unlocked: boolean } {
  return { unlocked: requires.includes(currentPlan) };
}
