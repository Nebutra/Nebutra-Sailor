import type {
  NotificationInboxItem,
  NotificationInboxSource,
  NotificationRuntimeStatus,
} from "@nebutra/notifications";
import { BellDot, CreditCard, ExternalLink, Shield, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { markNotificationRead } from "@/app/[locale]/(app)/settings/notifications/actions";

interface Props {
  locale: string;
  runtime: NotificationRuntimeStatus;
  inboxItems: NotificationInboxItem[];
  inboxSource: NotificationInboxSource;
  inboxReason?: string;
  unreadCount: number;
}

function getInboxIcon(groupId: NotificationInboxItem["groupId"]) {
  switch (groupId) {
    case "workspace":
      return Users;
    case "billing":
      return CreditCard;
    case "security":
      return Shield;
    case "product":
      return Sparkles;
    default:
      return BellDot;
  }
}

export function NotificationInboxPreview({
  locale,
  runtime,
  inboxItems,
  inboxSource,
  inboxReason,
  unreadCount,
}: Props) {
  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--neutral-12)]">Inbox preview</h3>
          <p className="mt-1 max-w-2xl text-sm text-[var(--neutral-11)]">
            This is the settings-side preview of Nebutra&apos;s in-app notification center. It is
            ready to be wired into the main shell once the main thread decides where the bell entry
            point should live.
          </p>
        </div>

        <div className="rounded-full bg-[var(--neutral-2)] px-3 py-1 text-xs font-medium text-[var(--neutral-12)]">
          {unreadCount} unread
        </div>
      </div>

      {inboxSource === "unavailable" ? (
        <div className="mt-5 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-4 py-4 text-sm text-[var(--neutral-11)]">
          {inboxReason ?? "No live inbox storage is connected yet for this environment."}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {inboxItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--neutral-7)] bg-[var(--neutral-2)] px-4 py-6 text-sm text-[var(--neutral-11)]">
            {inboxSource === "provider"
              ? "Your inbox is currently empty."
              : "Inbox messages will appear here once a persistent notification backend is connected."}
          </div>
        ) : (
          inboxItems.map((item) => {
            const Icon = getInboxIcon(item.groupId);
            const body = (
              <div
                className={`flex gap-3 rounded-lg border px-4 py-4 transition-colors ${
                  item.read
                    ? "border-[var(--neutral-7)] bg-[var(--neutral-1)]"
                    : "border-blue-200 bg-blue-50/60"
                }`}
              >
                <div className="rounded-md bg-[var(--neutral-2)] p-2 text-[var(--neutral-11)]">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[var(--neutral-12)]">{item.title}</p>
                    {!item.read ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                        New
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-sm text-[var(--neutral-11)]">{item.body}</p>
                  <p className="mt-2 text-xs text-[var(--neutral-10)]">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex shrink-0 items-start gap-2">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--neutral-7)] px-2.5 py-1.5 text-xs font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
                    >
                      Open
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  ) : null}

                  {!item.read ? (
                    <form action={markNotificationRead}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="notificationId" value={item.id} />
                      <button
                        type="submit"
                        disabled={!runtime.canMarkInboxRead}
                        className="rounded-md border border-[var(--neutral-7)] px-2.5 py-1.5 text-xs font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)] disabled:cursor-not-allowed disabled:opacity-50"
                        title={
                          runtime.canMarkInboxRead
                            ? "Mark this notification as read"
                            : runtime.reason
                        }
                      >
                        Mark read
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            );

            return <div key={item.id}>{body}</div>;
          })
        )}
      </div>
    </section>
  );
}
