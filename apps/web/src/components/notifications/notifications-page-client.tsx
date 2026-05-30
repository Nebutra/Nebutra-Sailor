"use client";

import { cn } from "@nebutra/ui/utils";
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { queryKeys } from "@/lib/query-keys";
import { InboxList, type InboxNotification } from "./inbox-list";

// =============================================================================
// NotificationsPageClient — full inbox page (client island)
// =============================================================================
// Wave 4b shipped InboxBell + InboxList; this component provides the dedicated
// /notifications page with: filter tabs (All / Unread), multi-select bulk
// actions, "mark all as read", cursor pagination ("Load more"), optimistic
// updates with revert-on-error, and an initial loading skeleton.
//
// React Query migration (Wave-2 phase-2):
//   - cursor pagination → useInfiniteQuery (filter lives in the queryKey, so
//     switching tabs spins up an independent cached query; the old manual
//     fetchPage/reducer page.append/page.replace plumbing is gone).
//   - mark-read / archive / bulk* → useMutation with onMutate optimistic cache
//     edits + onError rollback + onSettled invalidate. This replaces the old
//     snapshot.restore reducer rollback with the canonical RQ pattern.
//   - selection (Set<string>) stays pure client state in useState — it is UI
//     selection, NOT server cache, so it never enters React Query.
//   - useInfiniteQuery's `signal` (threaded into fetch) replaces the manual
//     `let cancelled` abort flag from the old useEffect.
//
// All UI strings live under `notifications.page.*` in @nebutra/i18n.
// =============================================================================

const PAGE_LIMIT = 50;

type FilterTab = "all" | "unread";

interface InboxApiResponse {
  success: boolean;
  data: {
    notifications: InboxNotification[];
    unreadCount: number;
    total: number;
    nextCursor: string | null;
  };
}

/** One page of inbox data, as returned by GET /api/notifications/inbox. */
interface InboxPage {
  items: InboxNotification[];
  unreadCount: number;
  total: number;
  nextCursor: string | null;
}

interface NotificationsPageClientProps {
  /** Optional API base — primarily for tests. */
  apiBase?: string;
  /** Optional fetch override — primarily for tests. */
  fetcher?: typeof fetch;
}

export function NotificationsPageClient({
  apiBase = "/api/notifications",
  fetcher,
}: NotificationsPageClientProps): React.ReactElement {
  const t = useTranslations("notifications.page");
  const fetchImpl = fetcher ?? (typeof fetch !== "undefined" ? fetch : undefined);

  const queryClient = useQueryClient();

  // Pure client state — selection set and last mutation error. Neither is
  // server cache, so both stay local (not in React Query).
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [mutationError, setMutationError] = useState<string | null>(null);

  // filter scopes the cached query, so each tab keeps its own paginated cache
  // and broad invalidation via `notificationsInbox.all` still matches.
  const listKey = useMemo(
    () => [...queryKeys.notificationsInbox.list(), filter] as const,
    [filter],
  );

  // ---------------------------------------------------------------------------
  // Fetching (cursor pagination via useInfiniteQuery)
  // ---------------------------------------------------------------------------

  const fetchPage = useCallback(
    async (cursor: string | null, signal?: AbortSignal): Promise<InboxPage> => {
      if (!fetchImpl) throw new Error(t("errors.load"));
      const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
      if (cursor) params.set("cursor", cursor);
      if (filter === "unread") params.set("unreadOnly", "true");

      let response: Response;
      try {
        response = await fetchImpl(`${apiBase}/inbox?${params.toString()}`, {
          credentials: "same-origin",
          signal,
        });
      } catch {
        throw new Error(t("errors.network"));
      }
      if (!response.ok) throw new Error(t("errors.load"));
      const json = (await response.json()) as InboxApiResponse;
      if (!json.success) throw new Error(t("errors.load"));
      return {
        items: json.data.notifications,
        unreadCount: json.data.unreadCount,
        total: json.data.total,
        nextCursor: json.data.nextCursor,
      };
    },
    [apiBase, fetchImpl, filter, t],
  );

  const inboxQuery = useInfiniteQuery({
    queryKey: listKey,
    queryFn: ({ pageParam, signal }) => fetchPage(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  // Flatten pages → items (preserves order / "Load more" append semantics).
  // unreadCount + total mirror the OLD reducer's page.append behaviour, which
  // overwrote both from the latest page — so read them off the last page.
  const items = useMemo(
    () => (inboxQuery.data?.pages ?? []).flatMap((page) => page.items),
    [inboxQuery.data],
  );
  const lastPage = inboxQuery.data?.pages.at(-1);
  const unreadCount = lastPage?.unreadCount ?? 0;

  const loading = inboxQuery.isPending;
  const loadingMore = inboxQuery.isFetchingNextPage;

  // ---------------------------------------------------------------------------
  // Optimistic cache helpers
  // ---------------------------------------------------------------------------

  type InboxInfinite = InfiniteData<InboxPage, string | null>;

  // Apply a pure transform to every page's items, recomputing unreadCount from
  // the resulting items so the toolbar badge stays consistent.
  const mapCachedItems = useCallback(
    (transform: (items: InboxNotification[]) => InboxNotification[]) => {
      queryClient.setQueryData<InboxInfinite>(listKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => {
            const nextItems = transform(page.items);
            return {
              ...page,
              items: nextItems,
              unreadCount: nextItems.reduce((n, item) => n + (item.read ? 0 : 1), 0),
            };
          }),
        };
      });
    },
    [listKey, queryClient],
  );

  // Shared onMutate: cancel in-flight refetch, snapshot, apply optimistic edit.
  const beginOptimistic = useCallback(
    async (transform: (items: InboxNotification[]) => InboxNotification[]) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<InboxInfinite>(listKey);
      mapCachedItems(transform);
      return { previous };
    },
    [listKey, mapCachedItems, queryClient],
  );

  const rollback = useCallback(
    (previous: InboxInfinite | undefined, message: string) => {
      if (previous !== undefined) {
        queryClient.setQueryData<InboxInfinite>(listKey, previous);
      }
      setMutationError(message);
    },
    [listKey, queryClient],
  );

  const settle = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: listKey });
  }, [listKey, queryClient]);

  // ---------------------------------------------------------------------------
  // Network calls
  // ---------------------------------------------------------------------------

  const patchRead = useCallback(
    async (id: string): Promise<void> => {
      if (!fetchImpl) throw new Error(t("errors.markRead"));
      const response = await fetchImpl(`${apiBase}/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ read: true }),
      });
      if (!response.ok) throw new Error(t("errors.markRead"));
    },
    [apiBase, fetchImpl, t],
  );

  const archiveOne = useCallback(
    async (id: string): Promise<void> => {
      if (!fetchImpl) throw new Error(t("errors.archive"));
      const response = await fetchImpl(`${apiBase}/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(t("errors.archive"));
    },
    [apiBase, fetchImpl, t],
  );

  // ---------------------------------------------------------------------------
  // Mutations (optimistic + rollback)
  // ---------------------------------------------------------------------------

  const markReadMutation = useMutation({
    mutationFn: (id: string) => patchRead(id),
    onMutate: (id: string) => {
      setMutationError(null);
      const readAt = new Date().toISOString();
      return beginOptimistic((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true, readAt } : item)),
      );
    },
    onError: (_err, _id, context) => rollback(context?.previous, t("errors.markRead")),
    onSettled: settle,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveOne(id),
    onMutate: (id: string) => {
      setMutationError(null);
      setSelectedIds((current) => {
        if (!current.has(id)) return current;
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      return beginOptimistic((current) => current.filter((item) => item.id !== id));
    },
    onError: (_err, _id, context) => rollback(context?.previous, t("errors.archive")),
    onSettled: settle,
  });

  // Bulk mark-read: optimistically mark every id read, fire PATCH for each, roll
  // back the whole batch if ANY request fails (matches old results.some(!ok)).
  const bulkMarkReadMutation = useMutation({
    mutationFn: async (ids: readonly string[]) => {
      await Promise.all(ids.map((id) => patchRead(id)));
    },
    onMutate: (ids: readonly string[]) => {
      setMutationError(null);
      const readAt = new Date().toISOString();
      const idSet = new Set(ids);
      setSelectedIds(() => new Set());
      return beginOptimistic((current) =>
        current.map((item) =>
          idSet.has(item.id) ? { ...item, read: true, readAt: item.readAt ?? readAt } : item,
        ),
      );
    },
    onError: (_err, _ids, context) => rollback(context?.previous, t("errors.bulkMarkRead")),
    onSettled: settle,
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: async (ids: readonly string[]) => {
      await Promise.all(ids.map((id) => archiveOne(id)));
    },
    onMutate: (ids: readonly string[]) => {
      setMutationError(null);
      const idSet = new Set(ids);
      setSelectedIds(() => new Set());
      return beginOptimistic((current) => current.filter((item) => !idSet.has(item.id)));
    },
    onError: (_err, _ids, context) => rollback(context?.previous, t("errors.archive")),
    onSettled: settle,
  });

  // ---------------------------------------------------------------------------
  // Action handlers
  // ---------------------------------------------------------------------------

  const markRead = useCallback(
    async (id: string) => {
      await markReadMutation.mutateAsync(id).catch(() => undefined);
    },
    [markReadMutation],
  );

  const handleArchive = useCallback(
    async (id: string) => {
      await archiveMutation.mutateAsync(id).catch(() => undefined);
    },
    [archiveMutation],
  );

  const bulkMarkRead = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await bulkMarkReadMutation.mutateAsync(Array.from(selectedIds)).catch(() => undefined);
  }, [bulkMarkReadMutation, selectedIds]);

  const bulkArchive = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await bulkArchiveMutation.mutateAsync(Array.from(selectedIds)).catch(() => undefined);
  }, [bulkArchiveMutation, selectedIds]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = items.flatMap((item) => (item.read ? [] : [item.id]));
    if (unreadIds.length === 0) return;
    await bulkMarkReadMutation.mutateAsync(unreadIds).catch(() => undefined);
  }, [bulkMarkReadMutation, items]);

  // ---------------------------------------------------------------------------
  // Pagination + selection + filter
  // ---------------------------------------------------------------------------

  const loadMore = useCallback(() => {
    if (!inboxQuery.hasNextPage || inboxQuery.isFetchingNextPage) return;
    void inboxQuery.fetchNextPage();
  }, [inboxQuery]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const changeFilter = useCallback((nextFilter: FilterTab) => {
    setFilter(nextFilter);
    setSelectedIds(() => new Set());
    setMutationError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const hasSelection = selectedIds.size > 0;
  const hasUnread = useMemo(() => items.some((n) => !n.read), [items]);
  const errorMessage = mutationError ?? (inboxQuery.error ? t("errors.load") : null);
  const hasMore = inboxQuery.hasNextPage;

  return (
    <div
      className="space-y-4"
      data-testid="notifications-page-client"
      aria-busy={loading || loadingMore}
    >
      <NotificationsToolbar
        filter={filter}
        unreadCount={unreadCount}
        loading={loading}
        hasUnread={hasUnread}
        allLabel={t("filter.all")}
        unreadLabel={t("filter.unread")}
        markAllReadLabel={t("actions.markAllRead")}
        onFilterChange={changeFilter}
        onMarkAllRead={markAllAsRead}
      />

      {hasSelection ? (
        <BulkActions
          selectedLabel={t("actions.selected", { count: selectedIds.size })}
          markReadLabel={t("actions.markRead")}
          archiveLabel={t("actions.archive")}
          onMarkRead={bulkMarkRead}
          onArchive={bulkArchive}
        />
      ) : null}

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <NotificationsListPanel
        notifications={items}
        loading={loading}
        selectedIds={selectedIds}
        emptyMessage={filter === "unread" ? t("empty.unread") : t("empty.all")}
        onMarkRead={markRead}
        onArchive={handleArchive}
        onToggleSelect={toggleSelect}
      />

      {hasMore ? (
        <LoadMoreButton
          loading={loadingMore}
          label={t("actions.loadMore")}
          loadingLabel={t("actions.loading")}
          onLoadMore={loadMore}
        />
      ) : null}
    </div>
  );
}

// =============================================================================
// Page sections
// =============================================================================

interface NotificationsToolbarProps {
  filter: FilterTab;
  unreadCount: number;
  loading: boolean;
  hasUnread: boolean;
  allLabel: string;
  unreadLabel: string;
  markAllReadLabel: string;
  onFilterChange: (filter: FilterTab) => void;
  onMarkAllRead: () => void;
}

function NotificationsToolbar({
  filter,
  unreadCount,
  loading,
  hasUnread,
  allLabel,
  unreadLabel,
  markAllReadLabel,
  onFilterChange,
  onMarkAllRead,
}: NotificationsToolbarProps): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--neutral-7)] pb-3">
      <div role="tablist" aria-label="Notification filter" className="flex gap-1">
        <FilterTabButton
          active={filter === "all"}
          onClick={() => onFilterChange("all")}
          label={allLabel}
          disabled={loading}
        />
        <FilterTabButton
          active={filter === "unread"}
          onClick={() => onFilterChange("unread")}
          label={unreadLabel}
          count={unreadCount}
          disabled={loading}
        />
      </div>
      <button
        type="button"
        onClick={() => void onMarkAllRead()}
        disabled={loading || !hasUnread}
        className="text-xs font-medium text-[var(--blue-9)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {markAllReadLabel}
      </button>
    </div>
  );
}

interface BulkActionsProps {
  selectedLabel: string;
  markReadLabel: string;
  archiveLabel: string;
  onMarkRead: () => void;
  onArchive: () => void;
}

function BulkActions({
  selectedLabel,
  markReadLabel,
  archiveLabel,
  onMarkRead,
  onArchive,
}: BulkActionsProps): React.ReactElement {
  return (
    <div
      data-testid="bulk-actions"
      className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-4 py-2"
    >
      <span className="text-sm text-[var(--neutral-11)]">{selectedLabel}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void onMarkRead()}
          className="rounded-[var(--radius-md)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-1.5 text-xs font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-3)]"
        >
          {markReadLabel}
        </button>
        <button
          type="button"
          onClick={() => void onArchive()}
          className="rounded-[var(--radius-md)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-1.5 text-xs font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-3)]"
        >
          {archiveLabel}
        </button>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }): React.ReactElement {
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

interface NotificationsListPanelProps {
  notifications: InboxNotification[];
  loading: boolean;
  selectedIds: Set<string>;
  emptyMessage: string;
  onMarkRead: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onToggleSelect: (id: string) => void;
}

function NotificationsListPanel({
  notifications,
  loading,
  selectedIds,
  emptyMessage,
  onMarkRead,
  onArchive,
  onToggleSelect,
}: NotificationsListPanelProps): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)]">
      <InboxList
        notifications={notifications}
        loading={loading}
        onMarkRead={onMarkRead}
        onArchive={onArchive}
        selectable
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        variant="full"
        emptyMessage={emptyMessage}
      />
    </div>
  );
}

interface LoadMoreButtonProps {
  loading: boolean;
  label: string;
  loadingLabel: string;
  onLoadMore: () => void;
}

function LoadMoreButton({
  loading,
  label,
  loadingLabel,
  onLoadMore,
}: LoadMoreButtonProps): React.ReactElement {
  return (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={() => void onLoadMore()}
        disabled={loading}
        className="rounded-[var(--radius-md)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2 text-sm font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-2)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? loadingLabel : label}
      </button>
    </div>
  );
}

// =============================================================================
// Filter tab button
// =============================================================================

interface FilterTabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  disabled?: boolean;
}

function FilterTabButton({
  active,
  onClick,
  label,
  count,
  disabled = false,
}: FilterTabButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "bg-[var(--neutral-3)] text-[var(--neutral-12)]"
          : "text-[var(--neutral-11)] hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)]",
      )}
    >
      {label}
      {typeof count === "number" && count > 0 ? (
        <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--blue-9)] px-1.5 text-[10px] font-semibold text-[var(--neutral-1)]">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
