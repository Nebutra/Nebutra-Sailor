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
    <DesignSystemShell
      notificationCenter={<ShellNotificationCenter locale={locale} />}
      productCapabilities={resolveWebProductCapabilities()}
    >
      {children}
    </DesignSystemShell>
  );
}
