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

  // Render PlanBadge once on the server; pass the element to both the shell
  // header and the account dialog (subscription tab). PlanBadge depends on
  // server-only modules (Prisma, next/headers) — it MUST be instantiated
  // in this Server Component, never imported from a Client Component.
  const planBadge = <PlanBadge />;

  return (
    <OnboardingMount>
      <FeedbackMount>
        <AccountDialogMount planBadge={planBadge}>
          <CommandPaletteMount>
            <DesignSystemShell
              notificationCenter={<ShellNotificationCenter locale={locale} />}
              planBadge={planBadge}
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
