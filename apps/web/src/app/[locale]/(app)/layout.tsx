import { CommandPaletteMount } from "@/app/[locale]/providers/command-palette-mount";
import { PlanBadge } from "@/components/billing/plan-badge";
import { ShellNotificationCenter } from "@/components/notifications/shell-notification-center";
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
    <CommandPaletteMount>
      <DesignSystemShell
        notificationCenter={<ShellNotificationCenter locale={locale} />}
        planBadge={<PlanBadge />}
        productCapabilities={resolveWebProductCapabilities()}
      >
        {children}
      </DesignSystemShell>
    </CommandPaletteMount>
  );
}
