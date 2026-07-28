"use client";

import { Badge, DataList, type DataListColumn } from "@nebutra/ui/primitives";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { queryKeys } from "@/lib/query-keys";

export interface WebhookEndpointView {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  signingSecretMasked: string;
  createdAt: string;
  lastDeliveredAt: string | null;
}

export interface WebhooksListProps {
  /** Initial endpoints (server-rendered) */
  initialEndpoints?: WebhookEndpointView[];
  /** Async loader — defaults to GET /api/webhooks */
  loadEndpoints?: () => Promise<WebhookEndpointView[]>;
  /** Per-row actions */
  onToggleActive?: (id: string, next: boolean) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onViewDeliveries?: (id: string) => void;
  onEdit?: (endpoint: WebhookEndpointView) => void;
}

async function defaultLoad(signal?: AbortSignal): Promise<WebhookEndpointView[]> {
  const { fetchWithTimeout } = await import("@nebutra/browser-utils");
  const response = await fetchWithTimeout("/api/webhooks", {
    cache: "no-store",
    signal,
    timeoutMs: 12_000,
  });
  if (!response.ok) throw new Error("Failed to load webhooks");
  const json = (await response.json()) as { endpoints: WebhookEndpointView[] };
  return json.endpoints;
}

export function WebhooksList({
  initialEndpoints,
  loadEndpoints,
  onToggleActive,
  onDelete,
  onViewDeliveries,
  onEdit,
}: WebhooksListProps) {
  const t = useTranslations("startupOs");
  const queryClient = useQueryClient();
  const listKey = queryKeys.webhooks.list();

  const endpointsQuery = useQuery({
    queryKey: listKey,
    queryFn: ({ signal }) => (loadEndpoints ? loadEndpoints() : defaultLoad(signal)),
    // Preserve SSR behaviour: when the parent hands us server-rendered rows we
    // seed the cache so no client fetch fires on mount (matches the old
    // `useState(initialEndpoints)` + `isLoading=false` branch).
    initialData: initialEndpoints,
  });

  // Toggle active — optimistically flip the cached row, rollback on failure.
  // Mirrors the previous local-state behaviour (immediate flip, revert on
  // rejection) but reconciles against the cache instead of detached state.
  const toggleMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      if (onToggleActive) await onToggleActive(id, next);
    },
    onMutate: async ({ id, next }: { id: string; next: boolean }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<WebhookEndpointView[]>(listKey);
      queryClient.setQueryData<WebhookEndpointView[]>(listKey, (current) =>
        (current ?? []).map((row) => (row.id === id ? { ...row, isActive: next } : row)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<WebhookEndpointView[]>(listKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  // Delete — optimistically drop the row, rollback on failure.
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (onDelete) await onDelete(id);
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<WebhookEndpointView[]>(listKey);
      queryClient.setQueryData<WebhookEndpointView[]>(listKey, (current) =>
        (current ?? []).filter((row) => row.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<WebhookEndpointView[]>(listKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const endpoints = endpointsQuery.data ?? [];

  function handleToggle(endpoint: WebhookEndpointView) {
    if (!onToggleActive) return;
    toggleMutation.mutate({ id: endpoint.id, next: !endpoint.isActive });
  }

  function handleDelete(endpoint: WebhookEndpointView) {
    if (!onDelete) return;
    deleteMutation.mutate(endpoint.id);
  }

  const columns: readonly DataListColumn<WebhookEndpointView>[] = [
    {
      id: "url",
      header: "URL",
      loadingWidth: "72%",
      cell: (endpoint) => (
        <div className="min-w-0">
          <span className="block truncate font-mono text-xs text-foreground">{endpoint.url}</span>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {endpoint.signingSecretMasked}
          </p>
        </div>
      ),
    },
    {
      id: "events",
      header: "Events",
      width: 96,
      loadingWidth: 24,
      cell: (endpoint) => <span className="text-muted-foreground">{endpoint.events.length}</span>,
    },
    {
      id: "status",
      header: "Status",
      width: 112,
      loadingWidth: 56,
      cell: (endpoint) =>
        // green-subtle is bg-success/15 + text-success (5.11:1); gray-subtle is
        // muted-on-muted. Both clear AA, unlike the old raw emerald-100/700 pair.
        endpoint.isActive ? (
          <Badge variant="green-subtle" size="sm">
            Active
          </Badge>
        ) : (
          <Badge variant="gray-subtle" size="sm">
            Disabled
          </Badge>
        ),
    },
    {
      id: "lastDelivered",
      header: "Last delivered",
      width: 200,
      cell: (endpoint) => (
        <span className="text-xs text-muted-foreground">
          {endpoint.lastDeliveredAt ? new Date(endpoint.lastDeliveredAt).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "end",
      loadingWidth: 120,
      cell: (endpoint) => (
        <div className="flex items-center gap-3 text-xs">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(endpoint)}
              className="text-[hsl(var(--primary))] hover:underline"
            >
              Edit
            </button>
          )}
          {onToggleActive && (
            <button
              type="button"
              onClick={() => handleToggle(endpoint)}
              className="text-muted-foreground hover:text-foreground"
            >
              {endpoint.isActive ? "Disable" : "Enable"}
            </button>
          )}
          {onViewDeliveries && (
            <button
              type="button"
              onClick={() => onViewDeliveries(endpoint.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              View deliveries
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => handleDelete(endpoint)}
              className="text-[hsl(var(--destructive-strong))] hover:text-[hsl(var(--destructive-strong))]/80"
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  // A settling optimistic mutation and a background refetch are both refreshes,
  // never "loading": the rows they touch must stay mounted or the optimistic
  // flip/removal would never be visible.
  const isRefreshing =
    (endpointsQuery.isFetching && !endpointsQuery.isPending) ||
    toggleMutation.isPending ||
    deleteMutation.isPending;

  return (
    <>
      {/* Skeleton rows are aria-hidden inside DataList, so the load itself is
          announced here. Kept as a real live region — the old markup's
          role="status" was the only screen-reader tell during a fetch. */}
      {endpointsQuery.isPending ? (
        <p className="sr-only" role="status">
          Loading…
        </p>
      ) : null}
      <DataList<WebhookEndpointView>
        label="Webhook endpoints"
        columns={columns}
        rows={endpoints}
        getRowKey={(endpoint) => endpoint.id}
        status={endpointsQuery.isPending ? "loading" : undefined}
        isRefreshing={isRefreshing}
        {...(endpointsQuery.error
          ? {
              errorTitle: <span role="alert">{t("errors.loadWebhookEndpoints")}</span>,
              error: "Check the endpoint service, then try the request again.",
              onRetry: () => {
                void endpointsQuery.refetch();
              },
              retryLabel: "Try again",
            }
          : {})}
        emptyTitle="Webhook endpoints"
        emptyDescription={t("emptyState.webhookEndpoints")}
      />
    </>
  );
}
