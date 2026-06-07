import { redirect } from "next/navigation";
import { Suspense } from "react";
import { decideOnboardingGate } from "@/components/onboarding/onboarding-redirect";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { getAuth, getTenantContext } from "@/lib/auth";

export default async function OnboardingPage() {
  const { userId, orgId } = await getAuth();
  const { plan } = await getTenantContext();

  const decision = decideOnboardingGate({
    isAuthenticated: !!userId,
    hasOrganization: !!orgId,
    plan: plan ?? null,
  });

  if (decision.action === "redirect") {
    redirect(decision.target);
  }

  return (
    <Suspense>
      <WizardShell />
    </Suspense>
  );
}
