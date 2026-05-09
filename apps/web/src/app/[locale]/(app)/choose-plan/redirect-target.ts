/**
 * Pure decision helper for /choose-plan server-side redirects.
 *
 * Extracted so we can unit test it without booting Next's RSC machinery.
 */
export interface ChoosePlanGuardInput {
  userId: string | null;
  orgId: string | null;
  active: boolean;
}

export interface ChoosePlanRedirect {
  destination: "/sign-in" | "/onboarding" | "/";
}

export function resolveChoosePlanRedirect(input: ChoosePlanGuardInput): ChoosePlanRedirect | null {
  if (!input.userId) {
    return { destination: "/sign-in" };
  }
  if (!input.orgId) {
    return { destination: "/onboarding" };
  }
  if (input.active) {
    return { destination: "/" };
  }
  return null;
}
