"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { InboxList, type InboxNotification } from "./inbox-list";

// =============================================================================
// InboxBell — header dropdown trigger + small dropdown panel
// =============================================================================
// Polls /api/notifications/inbox every 30s; refetches on window focus.
// Click notification → marks as read + navigates to data.href if present.
// =============================================================================

const POLL_INTERVAL_MS = 30_000;
const DROPDOWN_LIMIT = 10;

interface InboxApiResponse {
  success: boolean;
  data: {
    notifications: InboxNotification[];
    unreadCount: number;
    total: number;
    nextCursor: string | null;
  };
}

interface InboxBellProps {
  /** Optional href override for "View all" link (default `/notifications`). */
  viewAllHref?: string;
  /** Optional API base — primarily for tests. */
  apiBase?: string;
  /** Optional fetch override — primarily for tests. */
  fetcher?: typeof fetch;
}

export function InboxBell({
  viewAllHref = "/notifications",
  apiBase = "/api/notifications",
  fetcher,
}: InboxBellProps): React.ReactElement {
  const fetchImpl = fetcher ?? (typeof fetch !== "undefined" ? fetch : undefined);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    if (!fetchImpl) return;

    try {
      const response = await fetchImpl(`${apiBase}/inbox?limit=${DROPDOWN_LIMIT}`, {
        credentials: "same-origin",
      });
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const json = (await response.json()) as InboxApiResponse;
      if (json.success) {
        setItems(json.data.notifications);
        setUnreadCount(json.data.unreadCount);
      }
    } catch {
      // Silent — bell shows last known state if network blips.
    } finally {
      setLoading(false);
    }
  }, [apiBase, fetchImpl]);

  // Initial fetch + polling + focus refetch.
  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const markRead = useCallback(
    async (id: string) => {
      // Optimistic update
      const previous = items;
      const previousUnread = unreadCount;
      setItems((current) =>
        current.map((n) =>
          n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      if (!fetchImpl) return;
      try {
        const response = await fetchImpl(`${apiBase}/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ read: true }),
        });
        if (!response.ok) throw new Error("Failed to mark read");
      } catch {
        // Revert on failure
        setItems(previous);
        setUnreadCount(previousUnread);
      }
    },
    [apiBase, fetchImpl, items, unreadCount],
  );

  const markAllRead = useCallback(async () => {
    const previous = items;
    const previousUnread = unreadCount;
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setItems((current) => current.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    if (!fetchImpl) return;
    try {
      await Promise.all(
        unreadIds.map((id) =>
          fetchImpl(`${apiBase}/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ read: true }),
          }),
        ),
      );
    } catch {
      setItems(previous);
      setUnreadCount(previousUnread);
    }
  }, [apiBase, fetchImpl, items, unreadCount]);

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${badgeLabel} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--neutral-11)] transition-colors hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
        data-testid="inbox-bell-trigger"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            data-testid="inbox-bell-badge"
            className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
          >
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          data-testid="inbox-bell-panel"
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] shadow-lg sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-[var(--neutral-7)] px-4 py-2.5">
            <h2 className="text-sm font-semibold text-[var(--neutral-12)]">Notifications</h2>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
              className="text-xs font-medium text-[var(--blue-9)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all as read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <InboxList notifications={items} loading={loading} onMarkRead={markRead} />
          </div>

          <div className="border-t border-[var(--neutral-7)] px-4 py-2 text-center">
            <Link
              href={viewAllHref}
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-[var(--blue-9)] hover:underline"
            >
              View all
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
