import { loadNotificationSettingsSnapshot } from "@nebutra/notifications";
import { Bell, Mail, Smartphone } from "lucide-react";
import { NotificationInboxPreview } from "@/components/notifications/notification-inbox-preview";
import { NotificationPreferenceMatrix } from "@/components/notifications/notification-preference-matrix";
import { NotificationRuntimeBanner } from "@/components/notifications/notification-runtime-banner";
import { requireOrg } from "@/lib/auth";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}

export const metadata = {
  title: "Notifications — Settings",
};

export default async function NotificationSettingsPage({ params, searchParams }: Props) {
  const [{ locale }, query, { userId, orgId }] = await Promise.all([
    params,
    searchParams,
    requireOrg(),
  ]);

  const snapshot = await loadNotificationSettingsSnapshot({
    userId,
    tenantId: orgId,
    inboxLimit: 6,
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-[var(--neutral-12)]">Notifications</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--neutral-11)]">
          Tune how Nebutra reaches you for workspace activity, billing risk, security events, and
          product operations. Managed providers can save these preferences immediately; preview mode
          shows the product defaults without pretending they are persisted.
        </p>
      </div>

      {query.notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {query.notice}
        </div>
      ) : null}

      {query.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {query.error}
        </div>
      ) : null}

      <NotificationRuntimeBanner
        runtime={snapshot.runtime}
        preferenceSource={snapshot.preferenceSource}
        inboxSource={snapshot.inboxSource}
      />

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Bell,
            label: "Inbox signals",
            value: `${snapshot.channels.find((channel) => channel.id === "in_app")?.label ?? "Inbox"}`,
            description: "Highest-signal updates inside the Nebutra workspace.",
          },
          {
            icon: Mail,
            label: "Email delivery",
            value: `${snapshot.channels.find((channel) => channel.id === "email")?.label ?? "Email"}`,
            description: "Good for billing, security, and cross-session follow-up.",
          },
          {
            icon: Smartphone,
            label: "Push delivery",
            value: `${snapshot.channels.find((channel) => channel.id === "push")?.label ?? "Push"}`,
            description: "Shown as preview until a push dispatcher is connected.",
          },
        ].map(({ icon: Icon, label, value, description }) => (
          <div
            key={label}
            className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-5"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-[var(--neutral-2)] p-2 text-[var(--neutral-11)]">
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--neutral-10)]">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--neutral-12)]">{value}</p>
                <p className="mt-1 text-sm text-[var(--neutral-11)]">{description}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <NotificationPreferenceMatrix
        locale={locale}
        runtime={snapshot.runtime}
        preferenceSource={snapshot.preferenceSource}
        sections={snapshot.sections}
      />

      <NotificationInboxPreview
        locale={locale}
        runtime={snapshot.runtime}
        inboxItems={snapshot.inboxItems}
        inboxSource={snapshot.inboxSource}
        inboxReason={snapshot.inboxReason}
        unreadCount={snapshot.unreadCount}
      />
    </div>
  );
}
