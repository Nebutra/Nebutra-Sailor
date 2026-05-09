"use client";

import { useEffect, useState } from "react";

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

async function defaultLoad(): Promise<WebhookEndpointView[]> {
  const response = await fetch("/api/webhooks", { cache: "no-store" });
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
  const [endpoints, setEndpoints] = useState<WebhookEndpointView[]>(initialEndpoints ?? []);
  const [isLoading, setIsLoading] = useState(initialEndpoints === undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEndpoints !== undefined) return;
    let cancelled = false;
    const load = loadEndpoints ?? defaultLoad;
    load()
      .then((rows) => {
        if (!cancelled) {
          setEndpoints(rows);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load webhooks");
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialEndpoints, loadEndpoints]);

  if (isLoading) {
    return (
      <p className="py-4 text-sm text-center text-[var(--neutral-11)]" role="status">
        Loading…
      </p>
    );
  }

  if (error) {
    return (
      <p className="py-4 text-sm text-center text-red-600" role="alert">
        {error}
      </p>
    );
  }

  if (endpoints.length === 0) {
    return (
      <p className="py-4 text-sm text-center text-[var(--neutral-11)]">
        No webhook endpoints yet. Create one above.
      </p>
    );
  }

  async function handleToggle(endpoint: WebhookEndpointView) {
    if (!onToggleActive) return;
    const next = !endpoint.isActive;
    setEndpoints((prev) =>
      prev.map((row) => (row.id === endpoint.id ? { ...row, isActive: next } : row)),
    );
    try {
      await onToggleActive(endpoint.id, next);
    } catch {
      // revert
      setEndpoints((prev) =>
        prev.map((row) => (row.id === endpoint.id ? { ...row, isActive: !next } : row)),
      );
    }
  }

  async function handleDelete(endpoint: WebhookEndpointView) {
    if (!onDelete) return;
    setEndpoints((prev) => prev.filter((row) => row.id !== endpoint.id));
    try {
      await onDelete(endpoint.id);
    } catch {
      setEndpoints((prev) => [...prev, endpoint]);
    }
  }

  return (
    <table className="w-full text-sm" aria-label="Webhook endpoints">
      <thead>
        <tr className="border-b border-[var(--neutral-7)] text-left text-xs uppercase text-[var(--neutral-11)]">
          <th className="py-2 pr-4 font-medium">URL</th>
          <th className="py-2 pr-4 font-medium">Events</th>
          <th className="py-2 pr-4 font-medium">Status</th>
          <th className="py-2 pr-4 font-medium">Last delivered</th>
          <th className="py-2 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {endpoints.map((endpoint) => (
          <tr key={endpoint.id} className="border-b border-[var(--neutral-6)]">
            <td className="py-3 pr-4">
              <span className="font-mono text-xs text-[var(--neutral-12)]">{endpoint.url}</span>
              <p className="mt-0.5 font-mono text-[10px] text-[var(--neutral-10)]">
                {endpoint.signingSecretMasked}
              </p>
            </td>
            <td className="py-3 pr-4 text-[var(--neutral-11)]">{endpoint.events.length}</td>
            <td className="py-3 pr-4">
              {endpoint.isActive ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-[var(--neutral-4)] px-2 py-0.5 text-xs font-medium text-[var(--neutral-11)]">
                  Disabled
                </span>
              )}
            </td>
            <td className="py-3 pr-4 text-xs text-[var(--neutral-11)]">
              {endpoint.lastDeliveredAt ? new Date(endpoint.lastDeliveredAt).toLocaleString() : "—"}
            </td>
            <td className="py-3">
              <div className="flex items-center gap-3 text-xs">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(endpoint)}
                    className="text-[var(--blue-9)] hover:underline"
                  >
                    Edit
                  </button>
                )}
                {onToggleActive && (
                  <button
                    type="button"
                    onClick={() => handleToggle(endpoint)}
                    className="text-[var(--neutral-11)] hover:text-[var(--neutral-12)]"
                  >
                    {endpoint.isActive ? "Disable" : "Enable"}
                  </button>
                )}
                {onViewDeliveries && (
                  <button
                    type="button"
                    onClick={() => onViewDeliveries(endpoint.id)}
                    className="text-[var(--neutral-11)] hover:text-[var(--neutral-12)]"
                  >
                    View deliveries
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(endpoint)}
                    className="text-red-500 hover:text-red-700"
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
