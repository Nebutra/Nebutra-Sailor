import { loadNotificationSettingsSnapshot } from "@nebutra/notifications";
import { getAuth } from "@/lib/auth";
import { NotificationCenter } from "./notification-center";

interface ShellNotificationCenterProps {
  locale: string;
}

export async function ShellNotificationCenter({ locale }: ShellNotificationCenterProps) {
  const { userId, orgId } = await getAuth();

  if (!userId || !orgId) {
    return null;
  }

  const snapshot = await loadNotificationSettingsSnapshot({
    userId,
    tenantId: orgId,
    inboxLimit: 6,
  });

  return <NotificationCenter locale={locale} snapshot={snapshot} />;
}
