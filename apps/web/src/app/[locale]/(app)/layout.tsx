import { CommandPaletteMount } from "@/app/[locale]/providers/command-palette-mount";
import { AccountDialogMount } from "@/components/account/account-dialog";
import { PlanBadge } from "@/components/billing/plan-badge";
import { FeedbackMount } from "@/components/feedback/feedback-mount";
import { ShellNotificationCenter } from "@/components/notifications/shell-notification-center";
import { OnboardingMount } from "@/components/onboarding/onboarding-mount";
import { requireAuth } from "@/lib/auth";
import { resolveWebProductCapabilities } from "@/lib/product-capabilities";
import { DesignSystemShell } from "../providers/design-system-shell";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAuth();

  return (
    <OnboardingMount>
      <FeedbackMount>
        {/* PlanBadge depends on server-only modules; keep it in this Server Component. */}
        <AccountDialogMount planBadge={<PlanBadge />}>
          <CommandPaletteMount>
            <DesignSystemShell
              notificationCenter={<ShellNotificationCenter locale={locale} />}
              productCapabilities={resolveWebProductCapabilities()}
            >
              {children}
            </DesignSystemShell>
          </CommandPaletteMount>
        </AccountDialogMount>
      </FeedbackMount>
    </OnboardingMount>
  );
}
