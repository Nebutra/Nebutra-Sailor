"use client";

import {
  Bell,
  Bell as BellRing,
  Bug,
  Envelope as Mail,
  Star,
  Trash as Trash2,
} from "@nebutra/icons";
import Link from "next/link";

// =============================================================================
// InboxList — shared rendering for both the bell dropdown and the full page
// =============================================================================

export interface InboxNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  read: boolean;
  channel: string;
  data?: Record<string, unknown> | null;
}

export interface InboxListProps {
  notifications: InboxNotification[];
  onMarkRead?: (id: string) => void | Promise<void>;
  onArchive?: (id: string) => void | Promise<void>;
  loading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (id: string) => void;
  variant?: "compact" | "full";
}

function getIconForType(type: string): typeof Bell {
  if (type.startsWith("email") || type.includes(".email")) return Mail;
  if (type.startsWith("system.error") || type.includes("bug")) return Bug;
  if (type.startsWith("billing")) return Star;
  if (type.startsWith("security")) return BellRing;
  return Bell;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

export function InboxListSkeleton({ count = 3 }: { count?: number }): React.ReactElement {
  return (
    <ul className="divide-y divide-[var(--neutral-7)]" aria-label="Loading notifications">
      {Array.from({ length: count }).map((_, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
          key={i}
          className="flex animate-pulse gap-3 px-4 py-3"
        >
          <div className="h-8 w-8 rounded-full bg-[var(--neutral-3)]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-[var(--neutral-3)]" />
            <div className="h-3 w-2/3 rounded bg-[var(--neutral-3)]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function InboxEmptyState({
  message = "You're all caught up.",
}: {
  message?: string;
}): React.ReactElement {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center"
      data-testid="inbox-empty"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--neutral-2)]">
        <Bell className="h-5 w-5 text-[var(--neutral-11)]" aria-hidden="true" />
      </div>
      <p className="text-sm text-[var(--neutral-11)]">{message}</p>
    </div>
  );
}

export function InboxList({
  notifications,
  onMarkRead,
  onArchive,
  loading,
  emptyMessage,
  selectable = false,
  selectedIds,
  onToggleSelect,
  variant = "compact",
}: InboxListProps): React.ReactElement {
  if (loading) {
    return <InboxListSkeleton />;
  }

  if (notifications.length === 0) {
    return <InboxEmptyState message={emptyMessage} />;
  }

  return (
    <ul
      className="divide-y divide-[var(--neutral-7)]"
      data-testid="inbox-list"
      aria-label="Notifications"
    >
      {notifications.map((item) => {
        const Icon = getIconForType(item.type);
        const href = typeof item.data?.href === "string" ? (item.data.href as string) : undefined;
        const checked = selectedIds?.has(item.id) ?? false;

        const itemContent = (
          <div
            className={`flex gap-3 px-4 py-3 transition-colors ${
              item.read ? "bg-[var(--neutral-1)]" : "bg-blue-50/40 dark:bg-blue-950/20"
            } hover:bg-[var(--neutral-2)]`}
          >
            {selectable ? (
              <input
                data-allow-native
                type="checkbox"
                aria-label={`Select notification ${item.title}`}
                checked={checked}
                onChange={() => onToggleSelect?.(item.id)}
                className="mt-1 h-4 w-4 cursor-pointer accent-[var(--blue-9)]"
                onClick={(e) => e.stopPropagation()}
              />
            ) : null}

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--neutral-2)]">
              <Icon className="h-4 w-4 text-[var(--neutral-11)]" aria-hidden="true" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`truncate text-sm ${
                    item.read
                      ? "font-medium text-[var(--neutral-12)]"
                      : "font-semibold text-[var(--neutral-12)]"
                  }`}
                >
                  {item.title}
                </p>
                <time
                  className="shrink-0 text-xs text-[var(--neutral-11)]"
                  dateTime={item.createdAt}
                >
                  {relativeTime(item.createdAt)}
                </time>
              </div>
              {item.body ? (
                <p
                  className={`mt-0.5 text-xs text-[var(--neutral-11)] ${
                    variant === "compact" ? "line-clamp-2" : ""
                  }`}
                >
                  {item.body}
                </p>
              ) : null}
            </div>

            {!item.read ? (
              <span
                aria-label="Unread"
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--blue-9)]"
              />
            ) : null}

            {variant === "full" && onArchive ? (
              <button
                type="button"
                aria-label={`Archive notification ${item.title}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void onArchive(item.id);
                }}
                className="rounded-md p-1 text-[var(--neutral-11)] hover:bg-[var(--neutral-3)]"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        );

        return (
          <li key={item.id}>
            {href ? (
              <Link
                href={href}
                onClick={() => {
                  if (!item.read) void onMarkRead?.(item.id);
                }}
                className="block"
              >
                {itemContent}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!item.read) void onMarkRead?.(item.id);
                }}
                className="block w-full text-left"
              >
                {itemContent}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
