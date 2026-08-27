/**
 * Pure helper that decides whether the onboarding page should redirect a user
 * straight to the dashboard or render the wizard.
 *
 * Extracted into its own module so it can be unit-tested without mocking
 * Next.js server APIs.
 */

export interface OnboardingGateInput {
  readonly isAuthenticated: boolean;
  readonly hasOrganization: boolean;
  readonly plan: string | null | undefined;
}

export type OnboardingGateDecision =
  | { readonly action: "redirect"; readonly target: "/sign-in" | "/" }
  | { readonly action: "render-wizard" };

const FREE_PLANS = new Set(["", "FREE", "free", "trial", "TRIAL"]);

/**
 * Decide what the onboarding page should do for the current user.
 *
 * Rules:
 *   - Unauthenticated → redirect to /sign-in
 *   - Authenticated WITH an organization AND a non-free/active plan → redirect to /
 *     (they have already completed onboarding)
 *   - Otherwise → render the wizard
 */
export function decideOnboardingGate(input: OnboardingGateInput): OnboardingGateDecision {
  if (!input.isAuthenticated) {
    return { action: "redirect", target: "/sign-in" };
  }

  const planIsActive = !!input.plan && !FREE_PLANS.has(input.plan);
  if (input.hasOrganization && planIsActive) {
    return { action: "redirect", target: "/" };
  }

  return { action: "render-wizard" };
}
