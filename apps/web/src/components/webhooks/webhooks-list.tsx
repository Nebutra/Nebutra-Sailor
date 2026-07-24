"use client";

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

  if (endpointsQuery.isPending) {
    return (
      <p className="py-4 text-sm text-center text-muted-foreground" role="status">
        Loading…
      </p>
    );
  }

  if (endpointsQuery.error) {
    return (
      <p className="py-4 text-center text-sm text-red-11" role="alert">
        {t("errors.loadWebhookEndpoints")}
      </p>
    );
  }

  if (endpoints.length === 0) {
    return (
      <p className="py-4 text-sm text-center text-muted-foreground">
        {t("emptyState.webhookEndpoints")}
      </p>
    );
  }

  function handleToggle(endpoint: WebhookEndpointView) {
    if (!onToggleActive) return;
    toggleMutation.mutate({ id: endpoint.id, next: !endpoint.isActive });
  }

  function handleDelete(endpoint: WebhookEndpointView) {
    if (!onDelete) return;
    deleteMutation.mutate(endpoint.id);
  }

  return (
    <table className="w-full text-sm" aria-label="Webhook endpoints">
      <thead>
        <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
          <th className="py-2 pr-4 font-medium">URL</th>
          <th className="py-2 pr-4 font-medium">Events</th>
          <th className="py-2 pr-4 font-medium">Status</th>
          <th className="py-2 pr-4 font-medium">Last delivered</th>
          <th className="py-2 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {endpoints.map((endpoint) => (
          <tr key={endpoint.id} className="border-b border-border">
            <td className="py-3 pr-4">
              <span className="font-mono text-xs text-foreground">{endpoint.url}</span>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                {endpoint.signingSecretMasked}
              </p>
            </td>
            <td className="py-3 pr-4 text-muted-foreground">{endpoint.events.length}</td>
            <td className="py-3 pr-4">
              {endpoint.isActive ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Disabled
                </span>
              )}
            </td>
            <td className="py-3 pr-4 text-xs text-muted-foreground">
              {endpoint.lastDeliveredAt ? new Date(endpoint.lastDeliveredAt).toLocaleString() : "—"}
            </td>
            <td className="py-3">
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
                    className="text-red-11 hover:text-red-12"
                  >
                    Delete
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
