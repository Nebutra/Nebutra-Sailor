"use client";

import {
  Connection as Cable,
  External as ExternalLink,
  Plus,
  Trash as Trash2,
} from "@nebutra/icons";
import { ConfirmDialog, toast } from "@nebutra/ui/primitives";
import { useState } from "react";

/**
 * TEMPLATE — Connectors hub.
 *
 * Currently not wired to live data. The `Connector` Prisma model exists.
 * Activation path:
 *   1. POST /api/connectors with { type, name, config }
 *      → encrypt `config` via @nebutra/vault before persistence
 *   2. GET /api/connectors (list current user's connectors)
 *   3. DELETE /api/connectors/:id
 *   4. Wire `<ConnectorsHub connectors={data} onAdd={…} onRemove={…}>`
 *
 * `Connector.config` MUST be encrypted at the application layer — schema
 * does not enforce. Never log decrypted config. Use @nebutra/audit for
 * connection / disconnection events.
 */

export type ConnectorType = "mcp" | "api" | "oauth_app" | "webhook";

export interface ConnectorRow {
  id: string;
  type: ConnectorType;
  name: string;
  iconUrl?: string;
  isActive: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<ConnectorType, string> = {
  mcp: "MCP Server",
  api: "Custom API",
  oauth_app: "OAuth App",
  webhook: "Webhook",
};

const TYPE_ACCENT: Record<ConnectorType, string> = {
  mcp: "text-primary bg-primary/10 dark:text-primary dark:bg-primary/15",
  api: "text-cyan-11 bg-cyan-3 dark:text-cyan-9 dark:bg-cyan-9/20",
  oauth_app: "text-green-900 bg-green-200",
  webhook: "text-amber-900 bg-amber-200",
};

interface Props {
  connectors: ConnectorRow[];
  onAdd?: () => void;
  onRemove?: (connector: ConnectorRow) => Promise<void> | void;
}

export function ConnectorsHub({ connectors, onAdd, onRemove }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<ConnectorRow | null>(null);

  async function performRemove(connector: ConnectorRow) {
    if (!onRemove) return;
    setBusyId(connector.id);
    try {
      await onRemove(connector);
      toast.success("Connector removed", {
        description: `"${connector.name}" was disconnected.`,
      });
      setPendingRemove(null);
    } catch (err) {
      toast.error("Failed to remove connector", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  // Empty state.
  if (connectors.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-2xl)] border border-dashed border-neutral-7 bg-neutral-1 px-6 py-12 text-center/[0.02]">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-2xl)] text-white"
          style={{ background: "hsl(var(--primary))" }}
        >
          <Cable className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-12">
            Connect Sailor with your everyday apps, APIs, and MCPs
          </h2>
          <p className="mt-1 max-w-md text-xs text-neutral-10">
            Connectors let Sailor read and write across your stack — Stripe, Slack, your own APIs,
            MCP servers. Credentials are encrypted at the application layer.
          </p>
        </div>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "hsl(var(--primary))" }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add a connector
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-10">
          {connectors.length} active connector{connectors.length === 1 ? "" : "s"}
        </p>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary dark:text-primary dark:hover:text-primary"
          >
            <Plus className="h-3 w-3" />
            Add connector
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {connectors.map((connector) => {
          const isBusy = busyId === connector.id;
          return (
            <article
              key={connector.id}
              className={`group relative flex h-full flex-col rounded-[var(--radius-xl)] bg-neutral-2 p-4 transition-colors hover:bg-neutral-3 ${
                isBusy ? "opacity-60" : ""
              }`}
            >
              <div className="mb-3 flex items-start gap-3">
                {connector.iconUrl ? (
                  // biome-ignore lint/performance/noImgElement: external icon, not Next-optimizable
                  <img
                    src={connector.iconUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-[var(--radius-lg)] object-contain"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-neutral-2">
                    <Cable className="h-4 w-4 text-neutral-11" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-neutral-12">
                    {connector.name}
                  </h3>
                  <span
                    className={`mt-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                      TYPE_ACCENT[connector.type]
                    }`}
                  >
                    {TYPE_LABELS[connector.type]}
                  </span>
                </div>
                <span
                  role="img"
                  aria-label={connector.isActive ? "Active" : "Inactive"}
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    connector.isActive ? "bg-success" : "bg-neutral-9"
                  }`}
                />
              </div>

              <p className="text-[11px] text-neutral-10">
                {connector.lastUsedAt
                  ? `Last used ${new Date(connector.lastUsedAt).toLocaleDateString()}`
                  : "Not used yet"}
              </p>

              {onRemove && (
                <button
                  type="button"
                  onClick={() => setPendingRemove(connector)}
                  disabled={isBusy}
                  aria-label={`Remove ${connector.name}`}
                  className="absolute right-3 top-3 rounded-[var(--radius-md)] p-1 text-neutral-9 opacity-0 transition-[background-color,color,opacity] duration-150 group-hover:opacity-100 hover:bg-red-200 hover:text-red-900 focus-visible:opacity-100 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </article>
          );
        })}
      </div>

      {/* Branded delete confirmation */}
      <ConfirmDialog
        open={!!pendingRemove}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title="Remove this connector?"
        description={
          pendingRemove
            ? `"${pendingRemove.name}" will be disconnected. Any agents using it will lose access immediately.`
            : undefined
        }
        variant="destructive"
        confirmText="Remove"
        loading={busyId === pendingRemove?.id}
        onConfirm={() => {
          if (pendingRemove) void performRemove(pendingRemove);
        }}
      />

      <div className="border-t border-neutral-7 pt-3">
        <a
          href="/docs/connectors"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-neutral-10 transition-colors hover:text-neutral-12"
        >
          Learn about Connectors security
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </section>
  );
}
