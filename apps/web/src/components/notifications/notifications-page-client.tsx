"use client";

import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
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

type FetchPageResult = { data: FetchState } | { errorMessage: string };

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

interface PageState extends FetchState {
  filter: FilterTab;
  loading: boolean;
  loadingMore: boolean;
  selectedIds: Set<string>;
  errorMessage: string | null;
}

const EMPTY_STATE: FetchState = {
  items: [],
  unreadCount: 0,
  total: 0,
  nextCursor: null,
};

const INITIAL_PAGE_STATE: PageState = {
  ...EMPTY_STATE,
  filter: "all",
  loading: true,
  loadingMore: false,
  selectedIds: new Set(),
  errorMessage: null,
};

type PageAction =
  | { type: "filter.change"; filter: FilterTab }
  | { type: "page.replace"; payload: FetchState }
  | { type: "page.fail"; errorMessage: string }
  | { type: "page.loadingMore"; loadingMore: boolean }
  | { type: "page.append"; payload: FetchState }
  | { type: "error.set"; errorMessage: string }
  | { type: "selection.toggle"; id: string }
  | { type: "selection.clear" }
  | { type: "notification.markRead"; id: string; readAt: string }
  | { type: "notification.markReadMany"; ids: readonly string[]; readAt: string }
  | { type: "notification.archive"; ids: readonly string[] }
  | { type: "snapshot.restore"; snapshot: PageState; errorMessage: string };

function pageReducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case "filter.change":
      return {
        ...state,
        ...EMPTY_STATE,
        filter: action.filter,
        loading: true,
        loadingMore: false,
        selectedIds: new Set(),
        errorMessage: null,
      };
    case "page.replace":
      return {
        ...state,
        ...action.payload,
        loading: false,
        selectedIds: new Set(),
        errorMessage: null,
      };
    case "page.fail":
      return {
        ...state,
        ...EMPTY_STATE,
        loading: false,
        loadingMore: false,
        errorMessage: action.errorMessage,
      };
    case "page.loadingMore":
      return { ...state, loadingMore: action.loadingMore };
    case "page.append":
      return {
        ...state,
        items: [...state.items, ...action.payload.items],
        unreadCount: action.payload.unreadCount,
        total: action.payload.total,
        nextCursor: action.payload.nextCursor,
        loadingMore: false,
        errorMessage: null,
      };
    case "error.set":
      return { ...state, loadingMore: false, errorMessage: action.errorMessage };
    case "selection.toggle": {
      const selectedIds = new Set(state.selectedIds);
      if (selectedIds.has(action.id)) {
        selectedIds.delete(action.id);
      } else {
        selectedIds.add(action.id);
      }
      return { ...state, selectedIds };
    }
    case "selection.clear":
      return { ...state, selectedIds: new Set() };
    case "notification.markRead": {
      const wasUnread = state.items.some((item) => item.id === action.id && !item.read);
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id ? { ...item, read: true, readAt: action.readAt } : item,
        ),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    }
    case "notification.markReadMany": {
      const ids = new Set(action.ids);
      const unreadCount = state.items.reduce(
        (count, item) => count + (ids.has(item.id) && !item.read ? 1 : 0),
        0,
      );
      return {
        ...state,
        items: state.items.map((item) =>
          ids.has(item.id) ? { ...item, read: true, readAt: item.readAt ?? action.readAt } : item,
        ),
        unreadCount: Math.max(0, state.unreadCount - unreadCount),
        selectedIds: new Set(),
      };
    }
    case "notification.archive": {
      const archivedIds = new Set(action.ids);
      const archivedCount = state.items.reduce(
        (count, item) => count + (archivedIds.has(item.id) ? 1 : 0),
        0,
      );
      return {
        ...state,
        items: state.items.filter((item) => !archivedIds.has(item.id)),
        total: Math.max(0, state.total - archivedCount),
        selectedIds: new Set([...state.selectedIds].filter((id) => !archivedIds.has(id))),
      };
    }
    case "snapshot.restore":
      return { ...action.snapshot, errorMessage: action.errorMessage };
  }
}

export function NotificationsPageClient({
  apiBase = "/api/notifications",
  fetcher,
}: NotificationsPageClientProps): React.ReactElement {
  const t = useTranslations("notifications.page");
  const tRef = useRef(t);
  const fetchImpl = fetcher ?? (typeof fetch !== "undefined" ? fetch : undefined);

  const [state, dispatch] = useReducer(pageReducer, INITIAL_PAGE_STATE);
  const { filter, loading, loadingMore, selectedIds, errorMessage } = state;

  tRef.current = t;

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
    async (cursor: string | null, currentFilter: FilterTab): Promise<FetchPageResult> => {
      if (!fetchImpl) return { errorMessage: tRef.current("errors.load") };
      try {
        const response = await fetchImpl(buildUrl(cursor, currentFilter), {
          credentials: "same-origin",
        });
        if (!response.ok) {
          return { errorMessage: tRef.current("errors.load") };
        }
        const json = (await response.json()) as InboxApiResponse;
        if (!json.success) {
          return { errorMessage: tRef.current("errors.load") };
        }
        return {
          data: {
            items: json.data.notifications,
            unreadCount: json.data.unreadCount,
            total: json.data.total,
            nextCursor: json.data.nextCursor,
          },
        };
      } catch {
        return { errorMessage: tRef.current("errors.network") };
      }
    },
    [buildUrl, fetchImpl],
  );

  // Initial + filter-change fetch
  useEffect(() => {
    let cancelled = false;
    void fetchPage(null, filter).then((result) => {
      if (cancelled) return;
      if ("data" in result) {
        dispatch({ type: "page.replace", payload: result.data });
      } else {
        dispatch({ type: "page.fail", errorMessage: result.errorMessage });
      }
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
      dispatch({ type: "notification.markRead", id, readAt: new Date().toISOString() });

      const ok = await patchRead(id);
      if (!ok) {
        dispatch({
          type: "snapshot.restore",
          snapshot: previous,
          errorMessage: t("errors.markRead"),
        });
      }
    },
    [patchRead, state, t],
  );

  const handleArchive = useCallback(
    async (id: string) => {
      const previous = state;
      dispatch({ type: "notification.archive", ids: [id] });

      const ok = await archiveOne(id);
      if (!ok) {
        dispatch({
          type: "snapshot.restore",
          snapshot: previous,
          errorMessage: t("errors.archive"),
        });
      }
    },
    [archiveOne, state, t],
  );

  const bulkMarkRead = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const previous = state;
    dispatch({ type: "notification.markReadMany", ids, readAt: new Date().toISOString() });

    const results = await Promise.all(ids.map((id) => patchRead(id)));
    if (results.some((ok) => !ok)) {
      dispatch({
        type: "snapshot.restore",
        snapshot: previous,
        errorMessage: t("errors.bulkMarkRead"),
      });
    }
  }, [patchRead, selectedIds, state, t]);

  const bulkArchive = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const previous = state;
    dispatch({ type: "notification.archive", ids });

    const results = await Promise.all(ids.map((id) => archiveOne(id)));
    if (results.some((ok) => !ok)) {
      dispatch({
        type: "snapshot.restore",
        snapshot: previous,
        errorMessage: t("errors.archive"),
      });
    }
  }, [archiveOne, selectedIds, state, t]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = state.items.flatMap((item) => (item.read ? [] : [item.id]));
    if (unreadIds.length === 0) return;

    const previous = state;
    dispatch({
      type: "notification.markReadMany",
      ids: unreadIds,
      readAt: new Date().toISOString(),
    });

    const results = await Promise.all(unreadIds.map((id) => patchRead(id)));
    if (results.some((ok) => !ok)) {
      dispatch({
        type: "snapshot.restore",
        snapshot: previous,
        errorMessage: t("errors.bulkMarkRead"),
      });
    }
  }, [patchRead, state, t]);

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  const loadMore = useCallback(async () => {
    if (!state.nextCursor || loadingMore) return;
    dispatch({ type: "page.loadingMore", loadingMore: true });
    const result = await fetchPage(state.nextCursor, filter);
    if ("data" in result) {
      dispatch({ type: "page.append", payload: result.data });
    } else {
      dispatch({ type: "error.set", errorMessage: result.errorMessage });
    }
  }, [fetchPage, filter, loadingMore, state.nextCursor]);

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  const toggleSelect = useCallback((id: string) => {
    dispatch({ type: "selection.toggle", id });
  }, []);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const hasSelection = selectedIds.size > 0;
  const hasUnread = useMemo(() => state.items.some((n) => !n.read), [state.items]);

  return (
    <div
      className="space-y-4"
      data-testid="notifications-page-client"
      aria-busy={loading || loadingMore}
    >
      <NotificationsToolbar
        filter={filter}
        unreadCount={state.unreadCount}
        loading={loading}
        hasUnread={hasUnread}
        allLabel={t("filter.all")}
        unreadLabel={t("filter.unread")}
        markAllReadLabel={t("actions.markAllRead")}
        onFilterChange={(nextFilter) => dispatch({ type: "filter.change", filter: nextFilter })}
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
        notifications={state.items}
        loading={loading}
        selectedIds={selectedIds}
        emptyMessage={filter === "unread" ? t("empty.unread") : t("empty.all")}
        onMarkRead={markRead}
        onArchive={handleArchive}
        onToggleSelect={toggleSelect}
      />

      {state.nextCursor ? (
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
      className="flex items-center justify-between rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-4 py-2"
    >
      <span className="text-sm text-[var(--neutral-11)]">{selectedLabel}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void onMarkRead()}
          className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-1.5 text-xs font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-3)]"
        >
          {markReadLabel}
        </button>
        <button
          type="button"
          onClick={() => void onArchive()}
          className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-1.5 text-xs font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-3)]"
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
      className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive"
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
    <div className="overflow-hidden rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)]">
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
        className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2 text-sm font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-2)] disabled:cursor-not-allowed disabled:opacity-50"
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
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
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
