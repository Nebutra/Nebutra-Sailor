"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { InboxList, type InboxNotification } from "./inbox-list";

// =============================================================================
// NotificationsPageClient — full inbox page (client island)
// =============================================================================
// Wave 4b shipped InboxBell + InboxList; this component provides the dedicated
// /notifications page with: filter tabs (All / Unread), multi-select bulk
// actions, "mark all as read", cursor pagination ("Load more"), optimistic
// updates with revert-on-error, and an initial loading skeleton.
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

interface NotificationsPageClientProps {
  /** Optional API base — primarily for tests. */
  apiBase?: string;
  /** Optional fetch override — primarily for tests. */
  fetcher?: typeof fetch;
}

interface FetchState {
  items: InboxNotification[];
  unreadCount: number;
  total: number;
  nextCursor: string | null;
}

const EMPTY_STATE: FetchState = {
  items: [],
  unreadCount: 0,
  total: 0,
  nextCursor: null,
};

export function NotificationsPageClient({
  apiBase = "/api/notifications",
  fetcher,
}: NotificationsPageClientProps): React.ReactElement {
  const t = useTranslations("notifications.page");
  const fetchImpl = fetcher ?? (typeof fetch !== "undefined" ? fetch : undefined);

  const [filter, setFilter] = useState<FilterTab>("all");
  const [state, setState] = useState<FetchState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetching
  // ---------------------------------------------------------------------------

  const buildUrl = useCallback(
    (cursor: string | null, currentFilter: FilterTab): string => {
      const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
      if (cursor) params.set("cursor", cursor);
      if (currentFilter === "unread") params.set("unreadOnly", "true");
      return `${apiBase}/inbox?${params.toString()}`;
    },
    [apiBase],
  );

  const fetchPage = useCallback(
    async (cursor: string | null, currentFilter: FilterTab): Promise<FetchState | null> => {
      if (!fetchImpl) return null;
      try {
        const response = await fetchImpl(buildUrl(cursor, currentFilter), {
          credentials: "same-origin",
        });
        if (!response.ok) {
          setErrorMessage(t("errors.load"));
          return null;
        }
        const json = (await response.json()) as InboxApiResponse;
        if (!json.success) {
          setErrorMessage(t("errors.load"));
          return null;
        }
        return {
          items: json.data.notifications,
          unreadCount: json.data.unreadCount,
          total: json.data.total,
          nextCursor: json.data.nextCursor,
        };
      } catch {
        setErrorMessage(t("errors.network"));
        return null;
      }
    },
    [buildUrl, fetchImpl],
  );

  // Initial + filter-change fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);
    setSelectedIds(new Set());

    void fetchPage(null, filter).then((result) => {
      if (cancelled) return;
      setState(result ?? EMPTY_STATE);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [filter, fetchPage]);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const patchRead = useCallback(
    async (id: string): Promise<boolean> => {
      if (!fetchImpl) return false;
      try {
        const response = await fetchImpl(`${apiBase}/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ read: true }),
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    [apiBase, fetchImpl],
  );

  const archiveOne = useCallback(
    async (id: string): Promise<boolean> => {
      if (!fetchImpl) return false;
      try {
        const response = await fetchImpl(`${apiBase}/${id}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    [apiBase, fetchImpl],
  );

  const markRead = useCallback(
    async (id: string) => {
      const previous = state;
      const wasUnread = previous.items.find((n) => n.id === id && !n.read) !== undefined;
      setState((current) => ({
        ...current,
        items: current.items.map((n) =>
          n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n,
        ),
        unreadCount: wasUnread ? Math.max(0, current.unreadCount - 1) : current.unreadCount,
      }));

      const ok = await patchRead(id);
      if (!ok) {
        setState(previous);
        setErrorMessage(t("errors.markRead"));
      }
    },
    [patchRead, state],
  );

  const handleArchive = useCallback(
    async (id: string) => {
      const previous = state;
      setState((current) => ({
        ...current,
        items: current.items.filter((n) => n.id !== id),
        total: Math.max(0, current.total - 1),
      }));

      const ok = await archiveOne(id);
      if (!ok) {
        setState(previous);
        setErrorMessage(t("errors.archive"));
      }
    },
    [archiveOne, state],
  );

  const bulkMarkRead = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const previous = state;
    const previouslyUnread = previous.items.filter((n) => ids.includes(n.id) && !n.read);

    setState((current) => ({
      ...current,
      items: current.items.map((n) =>
        ids.includes(n.id) ? { ...n, read: true, readAt: new Date().toISOString() } : n,
      ),
      unreadCount: Math.max(0, current.unreadCount - previouslyUnread.length),
    }));
    setSelectedIds(new Set());

    const results = await Promise.all(ids.map((id) => patchRead(id)));
    if (results.some((ok) => !ok)) {
      setState(previous);
      setErrorMessage(t("errors.bulkMarkRead"));
    }
  }, [patchRead, selectedIds, state]);

  const bulkArchive = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const previous = state;

    setState((current) => ({
      ...current,
      items: current.items.filter((n) => !ids.includes(n.id)),
      total: Math.max(0, current.total - ids.length),
    }));
    setSelectedIds(new Set());

    const results = await Promise.all(ids.map((id) => archiveOne(id)));
    if (results.some((ok) => !ok)) {
      setState(previous);
      setErrorMessage(t("errors.archive"));
    }
  }, [archiveOne, selectedIds, state]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = state.items.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const previous = state;
    setState((current) => ({
      ...current,
      items: current.items.map((n) => ({
        ...n,
        read: true,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    }));

    const results = await Promise.all(unreadIds.map((id) => patchRead(id)));
    if (results.some((ok) => !ok)) {
      setState(previous);
      setErrorMessage(t("errors.bulkMarkRead"));
    }
  }, [patchRead, state]);

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  const loadMore = useCallback(async () => {
    if (!state.nextCursor || loadingMore) return;
    setLoadingMore(true);
    const result = await fetchPage(state.nextCursor, filter);
    if (result) {
      setState((current) => ({
        items: [...current.items, ...result.items],
        unreadCount: result.unreadCount,
        total: result.total,
        nextCursor: result.nextCursor,
      }));
    }
    setLoadingMore(false);
  }, [fetchPage, filter, loadingMore, state.nextCursor]);

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const hasSelection = selectedIds.size > 0;
  const hasUnread = useMemo(() => state.items.some((n) => !n.read), [state.items]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4" data-testid="notifications-page-client">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--neutral-7)] pb-3">
        <div role="tablist" aria-label="Notification filter" className="flex gap-1">
          <FilterTabButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={t("filter.all")}
          />
          <FilterTabButton
            active={filter === "unread"}
            onClick={() => setFilter("unread")}
            label={t("filter.unread")}
            count={state.unreadCount}
          />
        </div>
        <button
          type="button"
          onClick={() => void markAllAsRead()}
          disabled={!hasUnread}
          className="text-xs font-medium text-[var(--blue-9)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("actions.markAllRead")}
        </button>
      </div>

      {/* Bulk actions row */}
      {hasSelection ? (
        <div
          data-testid="bulk-actions"
          className="flex items-center justify-between rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-4 py-2"
        >
          <span className="text-sm text-[var(--neutral-11)]">
            {t("actions.selected", { count: selectedIds.size })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void bulkMarkRead()}
              className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-1.5 text-xs font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-3)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)]"
            >
              {t("actions.markRead")}
            </button>
            <button
              type="button"
              onClick={() => void bulkArchive()}
              className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-1.5 text-xs font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-3)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)]"
            >
              {t("actions.archive")}
            </button>
          </div>
        </div>
      ) : null}

      {/* Error banner */}
      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      ) : null}

      {/* List */}
      <div className="overflow-hidden rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)]">
        <InboxList
          notifications={state.items}
          loading={loading}
          onMarkRead={markRead}
          onArchive={handleArchive}
          selectable
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          variant="full"
          emptyMessage={filter === "unread" ? t("empty.unread") : t("empty.all")}
        />
      </div>

      {/* Load more */}
      {state.nextCursor ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2 text-sm font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-2)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMore ? t("actions.loading") : t("actions.loadMore")}
          </button>
        </div>
      ) : null}
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
}

function FilterTabButton({
  active,
  onClick,
  label,
  count,
}: FilterTabButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] ${
        active
          ? "bg-[var(--neutral-3)] text-[var(--neutral-12)]"
          : "text-[var(--neutral-11)] hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)]"
      }`}
    >
      {label}
      {typeof count === "number" && count > 0 ? (
        <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--blue-9)] px-1.5 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
