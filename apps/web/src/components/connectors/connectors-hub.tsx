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
  mcp: "text-blue-11 bg-blue-3 dark:text-blue-9 dark:bg-blue-9/20",
  api: "text-cyan-11 bg-cyan-3 dark:text-cyan-9 dark:bg-cyan-9/20",
  oauth_app: "text-green-11 bg-green-3 dark:text-green-9 dark:bg-green-9/20",
  webhook: "text-amber-11 bg-amber-3 dark:text-amber-9 dark:bg-amber-9/20",
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
      <section className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-7 bg-neutral-1 px-6 py-12 text-center dark:border-white/15 dark:bg-white/[0.02]">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          <Cable className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">
            Connect Sailor with your everyday apps, APIs, and MCPs
          </h2>
          <p className="mt-1 max-w-md text-xs text-neutral-10 dark:text-white/50">
            Connectors let Sailor read and write across your stack — Stripe, Slack, your own APIs,
            MCP servers. Credentials are encrypted at the application layer.
          </p>
        </div>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--brand-gradient)" }}
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
        <p className="text-xs text-neutral-10 dark:text-white/50">
          {connectors.length} active connector{connectors.length === 1 ? "" : "s"}
        </p>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-11 transition-colors hover:text-blue-12 dark:text-blue-9 dark:hover:text-blue-8"
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
              className={`group relative flex h-full flex-col rounded-xl border border-neutral-6 bg-neutral-1 p-4 transition-colors hover:border-neutral-8 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 ${
                isBusy ? "opacity-60" : ""
              }`}
            >
              <div className="mb-3 flex items-start gap-3">
                {connector.iconUrl ? (
                  // biome-ignore lint/performance/noImgElement: external icon, not Next-optimizable
                  <img
                    src={connector.iconUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-2 dark:bg-white/10">
                    <Cable className="h-4 w-4 text-neutral-11 dark:text-white/60" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-neutral-12 dark:text-white">
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
                    connector.isActive ? "bg-green-9" : "bg-neutral-9 dark:bg-white/30"
                  }`}
                />
              </div>

              <p className="text-[11px] text-neutral-10 dark:text-white/40">
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
                  className="absolute right-3 top-3 rounded-md p-1 text-neutral-9 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-2 hover:text-red-11 focus-visible:opacity-100 disabled:cursor-not-allowed dark:text-white/30 dark:hover:bg-red-2/30"
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

      <div className="border-t border-neutral-7 pt-3 dark:border-white/10">
        <a
          href="/docs/connectors"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-neutral-10 transition-colors hover:text-neutral-12 dark:text-white/50 dark:hover:text-white"
        >
          Learn about Connectors security
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </section>
  );
}
