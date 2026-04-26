import type {
  NotificationInboxItem,
  NotificationInboxSource,
  NotificationRuntimeStatus,
  NotificationSettingsSnapshot,
} from "@nebutra/notifications";
import { Bell, BellDot, CreditCard, ExternalLink, Shield, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/[locale]/(app)/settings/notifications/actions";

interface NotificationCenterProps {
  locale: string;
  snapshot: Pick<
    NotificationSettingsSnapshot,
    "runtime" | "inboxItems" | "inboxSource" | "inboxReason" | "unreadCount"
  >;
  defaultOpen?: boolean;
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

function getUnreadBadgeLabel(unreadCount: number) {
  if (unreadCount <= 0) return null;
  return unreadCount > 99 ? "99+" : String(unreadCount);
}

function getInboxEmptyCopy(inboxSource: NotificationInboxSource) {
  return inboxSource === "provider"
    ? "You are caught up. New workspace, billing, security, and product signals will appear here."
    : "Inbox messages will appear here once a persistent notification backend is connected.";
}

function NotificationCenterItem({
  item,
  locale,
  runtime,
}: {
  item: NotificationInboxItem;
  locale: string;
  runtime: NotificationRuntimeStatus;
}) {
  const Icon = getInboxIcon(item.groupId);

  return (
    <li
      className={`rounded-xl border px-3 py-3 ${
        item.read
          ? "border-neutral-7 bg-neutral-1 dark:border-white/10 dark:bg-white/5"
          : "border-blue-200 bg-blue-50/80 dark:border-blue-400/30 dark:bg-blue-400/10"
      }`}
    >
      <div className="flex gap-3">
        <div className="mt-0.5 rounded-lg bg-neutral-2 p-2 text-neutral-11 dark:bg-white/10 dark:text-white/70">
          <Icon className="h-4 w-4" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-neutral-12 dark:text-white">
              {item.title}
            </p>
            {!item.read ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-400/20 dark:text-blue-100">
                New
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-neutral-11 dark:text-white/65">
            {item.body}
          </p>
          <p className="mt-2 text-xs text-neutral-10 dark:text-white/45">
            {new Date(item.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {item.href ? (
          <Link
            href={item.href}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-7 px-2.5 py-1.5 text-xs font-medium text-neutral-12 transition-colors hover:bg-neutral-2 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
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
              className="rounded-lg border border-neutral-7 px-2.5 py-1.5 text-xs font-medium text-neutral-12 transition-colors hover:bg-neutral-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
              title={runtime.canMarkInboxRead ? "Mark this notification as read" : runtime.reason}
            >
              Mark read
            </button>
          </form>
        ) : null}
      </div>
    </li>
  );
}

export function NotificationCenter({
  locale,
  snapshot,
  defaultOpen = false,
}: NotificationCenterProps) {
  const unreadBadge = getUnreadBadgeLabel(snapshot.unreadCount);
  const unreadItems = snapshot.inboxItems.filter((item) => !item.read);
  const canMarkAllRead = snapshot.runtime.canMarkInboxRead && unreadItems.length > 0;

  return (
    <details className="group relative" open={defaultOpen}>
      <summary
        aria-label="Open notifications"
        className="relative flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border border-neutral-7 bg-neutral-1 text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-7 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white [&::-webkit-details-marker]:hidden"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unreadBadge ? (
          <span className="-right-1.5 -top-1.5 absolute flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white">
            {unreadBadge}
          </span>
        ) : null}
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-neutral-7 bg-neutral-1 shadow-2xl shadow-black/15 dark:border-white/10 dark:bg-neutral-12">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-7 px-4 py-3 dark:border-white/10">
          <div>
            <p className="text-sm font-semibold text-neutral-12 dark:text-white">Notifications</p>
            <p className="mt-0.5 text-xs text-neutral-10 dark:text-white/50">
              {snapshot.unreadCount} unread
            </p>
          </div>

          <form action={markAllNotificationsRead}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              disabled={!canMarkAllRead}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white"
              title={
                snapshot.runtime.canMarkInboxRead
                  ? "Mark every visible unread notification as read"
                  : snapshot.runtime.reason
              }
            >
              Mark all read
            </button>
          </form>
        </div>

        {snapshot.inboxSource === "unavailable" ? (
          <div className="mx-3 mt-3 rounded-xl border border-neutral-7 bg-neutral-2 px-3 py-3 text-sm text-neutral-11 dark:border-white/10 dark:bg-white/5 dark:text-white/65">
            {snapshot.inboxReason ?? "No live inbox storage is connected yet for this environment."}
          </div>
        ) : null}

        <div className="max-h-96 overflow-y-auto p-3">
          {snapshot.inboxItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-7 bg-neutral-2 px-4 py-8 text-center text-sm text-neutral-11 dark:border-white/10 dark:bg-white/5 dark:text-white/65">
              {getInboxEmptyCopy(snapshot.inboxSource)}
            </div>
          ) : (
            <ul className="space-y-2">
              {snapshot.inboxItems.map((item) => (
                <NotificationCenterItem
                  key={item.id}
                  item={item}
                  locale={locale}
                  runtime={snapshot.runtime}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-neutral-7 px-4 py-3 dark:border-white/10">
          <Link
            href={`/${locale}/settings/notifications`}
            className="text-xs font-medium text-blue-700 transition-colors hover:text-blue-800 dark:text-blue-200 dark:hover:text-blue-100"
          >
            Notification settings
          </Link>
        </div>
      </div>
    </details>
  );
}
