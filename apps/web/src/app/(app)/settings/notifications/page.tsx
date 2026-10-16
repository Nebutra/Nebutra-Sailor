import { brand } from "@nebutra/brand/metadata";
import { Bell, Envelope as Mail, DevicePhone as Smartphone } from "@nebutra/icons";
import { loadNotificationSettingsSnapshot } from "@nebutra/notifications";
import { PageHeader } from "@nebutra/ui/layout";
import { getTranslations } from "next-intl/server";
import { NotificationPreferencesSection } from "@/components/settings/notifications/notification-preferences-section";
import { requireOrg } from "@/lib/auth";

export const metadata = {
  title: "Notifications — Settings",
};

export default async function NotificationSettingsPage() {
  const tc = await getTranslations("copy.notificationsPage");
  const { userId, orgId } = await requireOrg();

  const snapshot = await loadNotificationSettingsSnapshot({
    userId,
    tenantId: orgId,
    inboxLimit: 6,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        size="section"
        title={tc("notifications")}
        description={tc("tuneHowReachesYou", { name: String(brand.name) })}
      />

      {/* One honest line about where preferences live, instead of an operator
          diagnostics panel (provider internals, missing integrations). */}
      <p className="flex items-center gap-2 text-sm text-neutral-11">
        <span
          aria-hidden
          className={`size-2 rounded-full ${snapshot.runtime.canManagePreferences ? "bg-success" : "bg-warning"}`}
        />
        {snapshot.runtime.canManagePreferences ? tc("preferencesLive") : tc("preferencesDefaults")}
      </p>

      <section className="grid overflow-hidden rounded-xl border border-border md:grid-cols-3 md:divide-x md:divide-border max-md:divide-y max-md:divide-border">
        {[
          {
            icon: Bell,
            label: tc("inboxSignals"),
            value: tc("inbox"),
            description: tc("inboxSignalsDescription", { name: brand.name }),
          },
          {
            icon: Mail,
            label: tc("emailDelivery"),
            value: tc("email"),
            description: tc("emailDeliveryDescription"),
          },
          {
            icon: Smartphone,
            label: tc("pushDelivery"),
            value: tc("push"),
            description: tc("pushDeliveryDescription"),
          },
        ].map(({ icon: Icon, label, value, description }) => (
          <div key={label} className="p-5">
            <div className="flex items-center gap-2 text-sm text-neutral-11">
              <Icon className="size-4" aria-hidden />
              {label}
            </div>
            <p className="mt-3 text-base font-semibold text-neutral-12">{value}</p>
            <p className="mt-1 text-sm text-neutral-11">{description}</p>
          </div>
        ))}
      </section>

      <NotificationPreferencesSection
        capabilities={{ hasPushSubscription: false, phoneVerified: false }}
      />
    </div>
  );
}
