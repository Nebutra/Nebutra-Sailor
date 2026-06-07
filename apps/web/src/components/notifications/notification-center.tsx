"use client";

import {
  Bell,
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
  NotificationSettingsSnapshot,
} from "@nebutra/notifications";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/(app)/settings/notifications/actions";
import { useAnchoredMenu } from "@/hooks/use-anchored-menu";

interface NotificationCenterProps {
  locale: string;
  snapshot: Pick<
    NotificationSettingsSnapshot,
    "runtime" | "inboxItems" | "inboxSource" | "inboxReason" | "unreadCount"
  >;
  defaultOpen?: boolean;
}

function InboxIcon({
  groupId,
  className,
}: {
  groupId: NotificationInboxItem["groupId"];
  className?: string;
}) {
  switch (groupId) {
    case "workspace":
      return <Users className={className} aria-hidden />;
    case "billing":
      return <CreditCard className={className} aria-hidden />;
    case "security":
      return <Shield className={className} aria-hidden />;
    case "product":
      return <Sparkles className={className} aria-hidden />;
    default:
      return <BellDot className={className} aria-hidden />;
  }
}

function getUnreadBadgeLabel(unreadCount: number) {
  if (unreadCount <= 0) return null;
  return unreadCount > 99 ? "99+" : String(unreadCount);
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
  const format = useFormatter();
  const createdAt = new Date(item.createdAt);
  const createdAtLabel = Number.isNaN(createdAt.getTime()) ? "" : format.relativeTime(createdAt);

  return (
    <li
      className={`rounded-[var(--radius-xl)] border px-3 py-3 ${
        item.read
          ? "border-neutral-7 bg-neutral-1"
          : "border-blue-200 bg-blue-50/80 dark:border-blue-400/30 dark:bg-blue-400/10"
      }`}
    >
      <div className="flex gap-3">
        <div className="mt-0.5 rounded-[var(--radius-lg)] bg-neutral-2 p-2 text-neutral-11">
          <InboxIcon groupId={item.groupId} className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-neutral-12">{item.title}</p>
            {!item.read ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-400/20 dark:text-blue-100">
                New
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-neutral-11">{item.body}</p>
          <time className="mt-2 block text-xs text-neutral-10" dateTime={item.createdAt}>
            {createdAtLabel}
          </time>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {item.href ? (
          <Link
            href={item.href}
            className="inline-flex items-center gap-1 rounded-[var(--radius-lg)] border border-neutral-7 px-2.5 py-1.5 text-xs font-medium text-neutral-12 transition-colors hover:bg-neutral-2"
          >
            Open
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        ) : null}

        {!item.read ? (
          <form action={markNotificationRead}>
            <input data-allow-native type="hidden" name="locale" value={locale} />
            <input data-allow-native type="hidden" name="notificationId" value={item.id} />
            <button
              type="submit"
              disabled={!runtime.canMarkInboxRead}
              className="rounded-[var(--radius-lg)] border border-neutral-7 px-2.5 py-1.5 text-xs font-medium text-neutral-12 transition-colors hover:bg-neutral-2 disabled:cursor-not-allowed disabled:opacity-50"
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
  const t = useTranslations("notifications.page");
  const unreadBadge = getUnreadBadgeLabel(snapshot.unreadCount);
  const unreadItems = snapshot.inboxItems.filter((item) => !item.read);
  const canMarkAllRead = snapshot.runtime.canMarkInboxRead && unreadItems.length > 0;
  const [open, setOpen] = useState(defaultOpen);
  const { triggerRef, menuRef, style } = useAnchoredMenu(open, () => setOpen(false));

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex size-8 items-center justify-center rounded-[var(--radius-md)] text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1"
      >
        <Bell className="size-4" aria-hidden />
        {unreadBadge ? (
          <span className="-right-1 -top-1 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white">
            {unreadBadge}
          </span>
        ) : null}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Notifications"
            style={style}
            className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[var(--radius-2xl)] border border-neutral-7 bg-neutral-1 shadow-2xl shadow-black/15"
          >
            <div className="flex items-start justify-between gap-3 border-b border-neutral-7 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-neutral-12">Notifications</p>
                <p className="mt-0.5 text-xs text-neutral-10">{snapshot.unreadCount} unread</p>
              </div>

              <form action={markAllNotificationsRead}>
                <input data-allow-native type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  disabled={!canMarkAllRead}
                  className="rounded-[var(--radius-lg)] px-2.5 py-1.5 text-xs font-medium text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12 disabled:cursor-not-allowed disabled:opacity-50"
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
              <div className="mx-3 mt-3 rounded-[var(--radius-xl)] border border-neutral-7 bg-neutral-2 p-3 text-sm text-neutral-11">
                {snapshot.inboxReason ?? t("inbox.noBackend")}
              </div>
            ) : null}

            <div className="max-h-96 overflow-y-auto p-3">
              {snapshot.inboxItems.length === 0 ? (
                <div className="rounded-[var(--radius-xl)] border border-dashed border-neutral-7 bg-neutral-2 px-4 py-8 text-center text-sm text-neutral-11">
                  {t("inbox.emptyCaughtUp")}
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

            <div className="border-t border-neutral-7 px-4 py-3">
              <Link
                href={`/${locale}/settings/notifications`}
                className="text-xs font-medium text-blue-700 transition-colors hover:text-blue-800 dark:text-blue-200 dark:hover:text-blue-100"
              >
                Notification settings
              </Link>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
