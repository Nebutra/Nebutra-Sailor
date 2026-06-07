"use client";

import { Bell } from "@nebutra/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import pLimit from "p-limit";
import { useEffect, useRef, useState } from "react";
import { queryKeys } from "@/lib/query-keys";
import { InboxList, type InboxNotification } from "./inbox-list";

// =============================================================================
// InboxBell — header dropdown trigger + small dropdown panel
// =============================================================================
// Polls /api/notifications/inbox every 30s; refetches on window focus.
// Click notification → marks as read + navigates to data.href if present.
//
// Mount choice:
//   • In Nebutra-Sailor's apps/web, the canonical bell is
//     <ShellNotificationCenter /> — server-rendered snapshot via
//     loadNotificationSettingsSnapshot from @nebutra/notifications.
//     It ships pre-wired in apps/web/src/app/(app)/layout.tsx
//     and is preferred when the full @nebutra/notifications stack is wired.
//   • <InboxBell /> is the lightweight, client-only alternative that
//     hits /api/notifications/inbox directly. Use it in scaffolded
//     downstream apps (via create-sailor) where the heavyweight snapshot
//     helper isn't desired, or when you want a route-level <Suspense>
//     boundary instead of a server fetch on every nav.
//
// Do not mount both at the same time — they render the same UX surface.
//
// React Query migration (equivalent-or-better):
//   • The server snapshot (notifications + unreadCount) now lives in the React
//     Query cache under queryKeys.notificationsInbox.list(). useQuery's
//     refetchInterval/refetchOnWindowFocus reproduce the old 30s setInterval +
//     window "focus" listener exactly, and the queryFn's `signal` replaces the
//     implicit per-request abort the manual fetch never had.
//   • markRead / markAllRead are useMutation with onMutate optimistic edits to
//     the cached snapshot and onError rollback — same instant UI the old local
//     state gave, plus a real onSettled reconciliation the old code lacked.
//   • markAllRead has no bulk endpoint, so it still fans out per-id PATCHes, but
//     now through p-limit (capped concurrency) instead of unbounded Promise.all.
//   • Dropdown open/close + outside-click stay pure local UI state (useState +
//     useRef) — never put UI toggles in the server cache.
// =============================================================================

const POLL_INTERVAL_MS = 30_000;
const DROPDOWN_LIMIT = 10;
const MARK_ALL_CONCURRENCY = 5;

interface InboxApiData {
  notifications: InboxNotification[];
  unreadCount: number;
  total: number;
  nextCursor: string | null;
}

interface InboxApiResponse {
  success: boolean;
  data: InboxApiData;
}

interface InboxBellProps {
  /** Optional href override for "View all" link (default `/notifications`). */
  viewAllHref?: string;
  /** Optional API base — primarily for tests. */
  apiBase?: string;
  /** Optional fetch override — primarily for tests. */
  fetcher?: typeof fetch;
}

const EMPTY_DATA: InboxApiData = {
  notifications: [],
  unreadCount: 0,
  total: 0,
  nextCursor: null,
};

export function InboxBell({
  viewAllHref = "/notifications",
  apiBase = "/api/notifications",
  fetcher,
}: InboxBellProps): React.ReactElement {
  const fetchImpl = fetcher ?? (typeof fetch !== "undefined" ? fetch : undefined);

  // Pure UI state — dropdown open/close + its outside-click container — stays
  // local. Never lives in the React Query cache.
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const queryClient = useQueryClient();
  const listKey = queryKeys.notificationsInbox.list();

  // Server snapshot — replaces the old useEffect + useState(loading/items/
  // unreadCount) + manual setInterval + focus listener. refetchInterval and
  // refetchOnWindowFocus reproduce the original polling + focus-refetch.
  const inboxQuery = useQuery({
    queryKey: listKey,
    queryFn: async ({ signal }): Promise<InboxApiData> => {
      if (!fetchImpl) return EMPTY_DATA;
      const response = await fetchImpl(`${apiBase}/inbox?limit=${DROPDOWN_LIMIT}`, {
        credentials: "same-origin",
        signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to load notifications (${response.status})`);
      }
      const json = (await response.json()) as InboxApiResponse;
      if (!json.success) {
        throw new Error("Failed to load notifications.");
      }
      return json.data;
    },
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  // Close on outside click — pure DOM/UI concern.
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

  // Single mark-as-read — optimistic edit of the cached snapshot + rollback.
  const markReadMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!fetchImpl) return;
      const response = await fetchImpl(`${apiBase}/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ read: true }),
      });
      if (!response.ok) {
        throw new Error("Failed to mark read");
      }
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<InboxApiData>(listKey);
      queryClient.setQueryData<InboxApiData>(listKey, (current) => {
        const snapshot = current ?? EMPTY_DATA;
        const target = snapshot.notifications.find((n) => n.id === id);
        const wasUnread = target ? !target.read : false;
        return {
          ...snapshot,
          notifications: snapshot.notifications.map((n) =>
            n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n,
          ),
          unreadCount: wasUnread ? Math.max(0, snapshot.unreadCount - 1) : snapshot.unreadCount,
        };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<InboxApiData>(listKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  // Mark all as read — no bulk endpoint, so fan out per-id PATCHes with capped
  // concurrency (p-limit) instead of the old unbounded Promise.all. Optimistic
  // edit of the cached snapshot + rollback mirrors the old local-state UX.
  const markAllReadMutation = useMutation({
    mutationFn: async (unreadIds: string[]): Promise<void> => {
      if (!fetchImpl || unreadIds.length === 0) return;
      const limit = pLimit(MARK_ALL_CONCURRENCY);
      await Promise.all(
        unreadIds.map((id) =>
          limit(async () => {
            const response = await fetchImpl(`${apiBase}/${id}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ read: true }),
            });
            if (!response.ok) {
              throw new Error("Failed to mark all read");
            }
          }),
        ),
      );
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<InboxApiData>(listKey);
      queryClient.setQueryData<InboxApiData>(listKey, (current) => {
        const snapshot = current ?? EMPTY_DATA;
        return {
          ...snapshot,
          notifications: snapshot.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        };
      });
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<InboxApiData>(listKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const handleMarkRead = (id: string): void => {
    markReadMutation.mutate(id);
  };

  const handleMarkAllRead = (): void => {
    const data = inboxQuery.data ?? EMPTY_DATA;
    const unreadIds = data.notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    markAllReadMutation.mutate(unreadIds);
  };

  const data = inboxQuery.data ?? EMPTY_DATA;
  const items = data.notifications;
  const unreadCount = data.unreadCount;
  const loading = inboxQuery.isPending;
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${badgeLabel} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--neutral-11)] transition-colors hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)]"
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
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] shadow-lg sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-[var(--neutral-7)] px-4 py-2.5">
            <h2 className="text-sm font-semibold text-[var(--neutral-12)]">Notifications</h2>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || markAllReadMutation.isPending}
              className="text-xs font-medium text-[var(--blue-9)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all as read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <InboxList notifications={items} loading={loading} onMarkRead={handleMarkRead} />
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
