"use client";

import { useEffect, useState } from "react";

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
  loadDeliveries?: (endpointId: string) => Promise<WebhookDeliveryView[]>;
  /** Override replay; defaults to POST /api/webhooks/[id]/deliveries/[deliveryId]/replay */
  onReplay?: (endpointId: string, deliveryId: string) => Promise<void>;
  onClose?: () => void;
}

async function defaultLoad(endpointId: string): Promise<WebhookDeliveryView[]> {
  const response = await fetch(`/api/webhooks/${endpointId}/deliveries`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load deliveries");
  const json = (await response.json()) as { deliveries: WebhookDeliveryView[] };
  return json.deliveries;
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
  const [deliveries, setDeliveries] = useState<WebhookDeliveryView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = loadDeliveries ?? defaultLoad;
    setIsLoading(true);
    setError(null);
    load(endpointId)
      .then((rows) => {
        if (!cancelled) {
          setDeliveries(rows);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load deliveries");
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [endpointId, loadDeliveries]);

  async function handleReplay(deliveryId: string) {
    if (!onReplay) return;
    setReplayingId(deliveryId);
    try {
      await onReplay(endpointId, deliveryId);
    } catch {
      // surfaced inline below
    } finally {
      setReplayingId(null);
    }
  }

  return (
    <aside
      aria-label="Webhook delivery history"
      className="flex h-full flex-col gap-4 border-l border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--neutral-12)]">Recent deliveries</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close deliveries panel"
            className="text-sm text-[var(--neutral-11)] hover:text-[var(--neutral-12)]"
          >
            Close
          </button>
        )}
      </header>

      {isLoading && (
        <p role="status" className="text-sm text-[var(--neutral-11)]">
          Loading…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-11">
          {error}
        </p>
      )}

      {!isLoading && !error && deliveries.length === 0 && (
        <p className="text-sm text-[var(--neutral-11)]">No deliveries yet.</p>
      )}

      <ul className="space-y-2">
        {deliveries.map((delivery) => {
          const isOpen = expandedId === delivery.id;
          return (
            <li
              key={delivery.id}
              className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-[var(--neutral-12)]">{delivery.eventType}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--neutral-10)]">
                    {new Date(delivery.createdAt).toLocaleString()}
                    {delivery.responseTimeMs !== null && ` · ${delivery.responseTimeMs}ms`}
                    {delivery.retryCount > 0 && ` · retries ${delivery.retryCount}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={delivery.status} />
                  {delivery.statusCode !== null && (
                    <span className="font-mono text-[10px] text-[var(--neutral-11)]">
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
                  className="text-[var(--blue-9)] hover:underline"
                >
                  {isOpen ? "Hide payload" : "View payload"}
                </button>
                {onReplay && (
                  <button
                    type="button"
                    disabled={replayingId === delivery.id}
                    onClick={() => handleReplay(delivery.id)}
                    className="text-[var(--neutral-11)] hover:text-[var(--neutral-12)] disabled:opacity-50"
                  >
                    {replayingId === delivery.id ? "Replaying…" : "Replay"}
                  </button>
                )}
              </div>

              {isOpen && (
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-[var(--neutral-2)] p-2 text-[10px] text-[var(--neutral-12)]">
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
