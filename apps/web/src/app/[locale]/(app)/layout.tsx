import type { Metadata } from "next";
import { CommandPaletteMount } from "@/app/[locale]/providers/command-palette-mount";
import { AccountDialogMount } from "@/components/account/account-dialog";
import { AppearanceVarsProvider } from "@/components/appearance";
import { PlanBadge } from "@/components/billing/plan-badge";
import { FeedbackMount } from "@/components/feedback/feedback-mount";
import { OnboardingMount } from "@/components/onboarding/onboarding-mount";
import { requireAuth } from "@/lib/auth";
import { resolveWebProductCapabilities } from "@/lib/product-capabilities";
import { DesignSystemShell } from "../providers/design-system-shell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await params;
  await requireAuth();

  return (
    <OnboardingMount>
      <FeedbackMount>
        {/* PlanBadge depends on server-only modules; keep it in this Server Component. */}
        <AccountDialogMount planBadge={<PlanBadge />}>
          <CommandPaletteMount>
            <DesignSystemShell productCapabilities={resolveWebProductCapabilities()}>
              <AppearanceVarsProvider />
              {children}
            </DesignSystemShell>
          </CommandPaletteMount>
        </AccountDialogMount>
      </FeedbackMount>
    </OnboardingMount>
  );
}
