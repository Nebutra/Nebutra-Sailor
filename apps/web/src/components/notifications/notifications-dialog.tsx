"use client";

import {
  Bell,
  CreditCard,
  External as ExternalLink,
  Shield,
  Sparkles,
  Users,
} from "@nebutra/icons";
import type { NotificationInboxItem, NotificationSettingsSnapshot } from "@nebutra/notifications";
import { Dialog, DialogContent } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { queryKeys } from "@/lib/query-keys";

type Tab = "all" | "changelog" | "messages";

type Snapshot = Pick<
  NotificationSettingsSnapshot,
  "runtime" | "inboxItems" | "inboxSource" | "inboxReason" | "unreadCount"
>;

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "all", label: "全部" },
  { id: "changelog", label: "更新日志" },
  { id: "messages", label: "消息" },
];

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
      return Bell;
  }
}

function getTypeLabel(groupId: NotificationInboxItem["groupId"]): string {
  switch (groupId) {
    case "product":
      return "更新日志";
    case "workspace":
      return "工作区";
    case "billing":
      return "账单";
    case "security":
      return "安全";
    default:
      return "消息";
  }
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(d);
}

async function fetchNotificationSnapshot(signal: AbortSignal): Promise<Snapshot> {
  const response = await fetch("/api/notifications", { credentials: "include", signal });
  if (!response.ok) {
    throw new Error("Failed to load notifications.");
  }

  const data = (await response.json()) as { snapshot?: Snapshot };
  if (!data.snapshot) {
    throw new Error("Notification snapshot missing.");
  }

  return data.snapshot;
}

/**
 * In-shell notifications modal. The notification bell in the content header
 * opens this dialog instead of navigating to /notifications, so users never
 * lose page context. The /notifications page route remains as a deep-link /
 * SEO-safe fallback (rendered by another component).
 */
export function NotificationsDialog() {
  const locale = useLocale();
  const t = useTranslations("notifications.page");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");

  const snapshotQuery = useQuery({
    queryKey: queryKeys.notifications.settings(),
    queryFn: ({ signal }) => fetchNotificationSnapshot(signal),
    enabled: open,
    staleTime: 30_000,
  });

  const snapshot = snapshotQuery.data ?? null;

  const items = snapshot?.inboxItems ?? [];
  const filtered =
    tab === "all"
      ? items
      : tab === "changelog"
        ? items.filter((i) => i.groupId === "product")
        : items.filter((i) => i.groupId !== "product");

  const unreadBadge = (() => {
    const n = snapshot?.unreadCount ?? 0;
    if (n <= 0) return null;
    return n > 99 ? "99+" : String(n);
  })();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open notifications"
        title="Notifications"
        className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-4" aria-hidden="true" />
        {unreadBadge ? (
          <span className="-right-1 -top-1 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
            {unreadBadge}
          </span>
        ) : null}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-3xl overflow-hidden p-0 sm:rounded-[var(--radius-2xl)]"
          aria-label="通知"
        >
          {/* Header — centered title. DialogContent already provides its own
 top-right close button; do NOT add another. */}
          <div className="border-b border-border px-6 pt-6 pb-4">
            <h2 className="text-center text-lg font-semibold text-foreground">通知</h2>

            {/* Tab bar — segmented control */}
            <div className="mt-4 flex justify-center">
              <div className="inline-flex rounded-[var(--radius-md)] border border-border bg-muted p-0.5">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "h-7 rounded-[calc(var(--radius-md)-2px)] px-4 text-xs font-medium transition",
                      tab === t.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Feed */}
          <div className="max-h-[68vh] overflow-y-auto px-6 py-6">
            {snapshotQuery.isPending && !snapshot ? (
              <p className="py-10 text-center text-sm text-muted-foreground">加载中…</p>
            ) : snapshotQuery.isError && !snapshot ? (
              <div
                role="alert"
                className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground"
              >
                <p>通知加载失败</p>
                <button
                  type="button"
                  onClick={() => {
                    void snapshotQuery.refetch();
                  }}
                  className="inline-flex h-8 items-center rounded-[var(--radius-md)] border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  重试
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {tab === "changelog" ? t("inbox.emptyChangelog") : t("inbox.emptyCaughtUp")}
              </p>
            ) : (
              <ul className="space-y-6">
                {filtered.map((item) => {
                  const Icon = getInboxIcon(item.groupId);
                  return (
                    <li key={item.id} className="grid gap-4 md:grid-cols-[140px_1fr]">
                      {/* Left meta */}
                      <div className="text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">{getTypeLabel(item.groupId)}</p>
                        <p className="mt-1 tabular-nums">{formatDate(item.createdAt, locale)}</p>
                      </div>

                      {/* Right rich card */}
                      <article
                        className={cn(
                          "rounded-[var(--radius-xl)] border bg-card p-4 transition-colors",
                          item.read
                            ? "border-border"
                            : "border-primary/20 bg-primary/5 dark:border-primary/30 dark:bg-primary/5",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-[var(--radius-md)] bg-muted p-2 text-muted-foreground">
                            <Icon className="size-4" aria-hidden="true" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-foreground">
                                {item.title}
                              </h3>
                              {!item.read && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary dark:bg-primary/20 dark:text-primary">
                                  New
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                            {item.href && (
                              <Link
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary dark:text-primary dark:hover:text-primary"
                              >
                                打开
                                <ExternalLink className="size-3" aria-hidden="true" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
