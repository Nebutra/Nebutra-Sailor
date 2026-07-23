import {
  BellSmall as BellDot,
  CreditCard,
  External as ExternalLink,
  Shield,
  Sparkles,
  Users,
} from "@nebutra/icons";
import type {
  NotificationInboxItem,
  NotificationInboxSource,
  NotificationRuntimeStatus,
} from "@nebutra/notifications";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { markNotificationRead } from "@/app/(app)/settings/notifications/actions";

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

export async function NotificationInboxPreview({
  locale,
  runtime,
  inboxItems,
  inboxSource,
  inboxReason,
  unreadCount,
}: Props) {
  const t = await getTranslations("notifications.page");
  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-background p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Inbox preview</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            This is the settings-side preview of Nebutra&apos;s in-app notification center. It is
            ready to be wired into the main shell once the main thread decides where the bell entry
            point should live.
          </p>
        </div>

        <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
          {unreadCount} unread
        </div>
      </div>

      {inboxSource === "unavailable" ? (
        <div className="mt-5 rounded-[var(--radius-lg)] border border-border bg-muted px-4 py-4 text-sm text-muted-foreground">
          {inboxReason ?? t("inbox.noBackend")}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {inboxItems.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-muted px-4 py-6 text-sm text-muted-foreground">
            {inboxSource === "provider" ? t("inbox.emptyCaughtUp") : t("inbox.noBackend")}
          </div>
        ) : (
          inboxItems.map((item) => {
            const Icon = getInboxIcon(item.groupId);
            const body = (
              <div
                className={`flex gap-3 rounded-[var(--radius-lg)] border px-4 py-4 transition-colors ${
                  item.read ? "border-border bg-background" : "border-primary/20 bg-primary/5"
                }`}
              >
                <div className="rounded-[var(--radius-md)] bg-muted p-2 text-muted-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {!item.read ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        New
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex shrink-0 items-start gap-2">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Open
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  ) : null}

                  {!item.read ? (
                    <form action={markNotificationRead}>
                      <input data-allow-native type="hidden" name="locale" value={locale} />
                      <input
                        data-allow-native
                        type="hidden"
                        name="notificationId"
                        value={item.id}
                      />
                      <button
                        type="submit"
                        disabled={!runtime.canMarkInboxRead}
                        className="rounded-[var(--radius-md)] border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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
