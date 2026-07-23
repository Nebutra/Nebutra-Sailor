"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { queryKeys } from "@/lib/query-keys";

export interface WebhookDeliveryView {
  id: string;
  eventType: string;
  status: "success" | "failed" | "retrying";
  statusCode: number | null;
  responseTimeMs: number | null;
  retryCount: number;
  errorMessage: string | null;
  payload: unknown;
  createdAt: string;
  processedAt: string | null;
}

export interface WebhookDeliveriesPanelProps {
  endpointId: string;
  /** Override loader; defaults to GET /api/webhooks/[id]/deliveries */
  loadDeliveries?: (endpointId: string, signal?: AbortSignal) => Promise<WebhookDeliveryView[]>;
  /** Override replay; defaults to POST /api/webhooks/[id]/deliveries */
  onReplay?: (endpointId: string, deliveryId: string) => Promise<void>;
  onClose?: () => void;
}

async function defaultLoad(
  endpointId: string,
  signal?: AbortSignal,
): Promise<WebhookDeliveryView[]> {
  const response = await fetch(`/api/webhooks/${endpointId}/deliveries`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("Failed to load deliveries");
  const json = (await response.json()) as { deliveries: WebhookDeliveryView[] };
  return json.deliveries;
}

async function defaultReplay(endpointId: string, deliveryId: string): Promise<void> {
  const response = await fetch(`/api/webhooks/${endpointId}/deliveries`, {
    body: JSON.stringify({ deliveryId }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to replay delivery");
}

function StatusPill({ status }: { status: WebhookDeliveryView["status"] }) {
  const styles: Record<WebhookDeliveryView["status"], string> = {
    success: "bg-green-3 text-green-11",
    failed: "bg-red-3 text-red-11",
    retrying: "bg-amber-3 text-amber-11",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export function WebhookDeliveriesPanel({
  endpointId,
  loadDeliveries,
  onReplay,
  onClose,
}: WebhookDeliveriesPanelProps) {
  const t = useTranslations("startupOs");
  // Pure UI state (which payload is expanded) stays local — not server cache.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const listKey = queryKeys.webhookDeliveries.list(endpointId);
  const load = loadDeliveries ?? defaultLoad;
  const replay = onReplay ?? defaultReplay;

  const deliveriesQuery = useQuery({
    queryKey: listKey,
    // useQuery's signal replaces the old `let cancelled` abort flag.
    queryFn: ({ signal }) => load(endpointId, signal),
  });

  const replayMutation = useMutation({
    mutationFn: (deliveryId: string) => replay(endpointId, deliveryId),
    // Refetch the list after a successful replay — equivalent to the previous
    // `setDeliveries(await load(...))` reload. onSettled also fires on failure,
    // matching the old code which reloaded in the finally-less catch path only
    // implicitly; invalidation here is strictly safe (reconciles either way).
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const handleReplay = (deliveryId: string) => {
    replayMutation.mutate(deliveryId);
  };

  const deliveries = deliveriesQuery.data ?? [];
  const isLoading = deliveriesQuery.isPending;
  const error =
    deliveriesQuery.error || replayMutation.error
      ? deliveriesQuery.error
        ? t("errors.loadWebhookDeliveries")
        : t("errors.replayWebhookDelivery")
      : null;
  // Track the in-flight replay id so only its row shows the "Replaying…" label,
  // mirroring the previous single-replay-at-a-time behaviour.
  const replayingId = replayMutation.isPending ? replayMutation.variables : null;

  return (
    <aside
      aria-label="Webhook delivery history"
      className="flex h-full flex-col gap-4 border-l border-border bg-background p-6"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Recent deliveries</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close deliveries panel"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        )}
      </header>

      {isLoading && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-11">
          {error}
        </p>
      )}

      {!isLoading && !error && deliveries.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("emptyState.webhookDeliveries")}</p>
      )}

      <ul className="space-y-2">
        {deliveries.map((delivery) => {
          const isOpen = expandedId === delivery.id;
          return (
            <li
              key={delivery.id}
              className="rounded-[var(--radius-md)] border border-border bg-background p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-foreground">{delivery.eventType}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {new Date(delivery.createdAt).toLocaleString()}
                    {delivery.responseTimeMs !== null && ` · ${delivery.responseTimeMs}ms`}
                    {delivery.retryCount > 0 && ` · retries ${delivery.retryCount}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={delivery.status} />
                  {delivery.statusCode !== null && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      HTTP {delivery.statusCode}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center gap-3 text-xs">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setExpandedId(isOpen ? null : delivery.id)}
                  className="text-[hsl(var(--primary))] hover:underline"
                >
                  {isOpen ? "Hide payload" : "View payload"}
                </button>
                <button
                  type="button"
                  disabled={replayingId === delivery.id}
                  onClick={() => handleReplay(delivery.id)}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {replayingId === delivery.id ? "Replaying…" : "Replay"}
                </button>
              </div>

              {isOpen && (
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 text-[10px] text-foreground">
                  {JSON.stringify(delivery.payload, null, 2)}
                  {delivery.errorMessage && `\n\nError: ${delivery.errorMessage}`}
                </pre>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
