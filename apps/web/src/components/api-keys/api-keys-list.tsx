"use client";

import { useState } from "react";

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  scopes: string[];
  rateLimitRps: number;
  expiresAt: string | null;
  createdAt: string;
}

interface ApiKeysListProps {
  keys: ApiKey[];
  onCreate: () => void;
  onRevoke: (id: string) => void | Promise<void>;
  emptyTitle?: string;
  emptyCta?: string;
  columnLabels?: {
    name?: string;
    prefix?: string;
    lastUsed?: string;
    scopes?: string;
    created?: string;
    actions?: string;
    revoke?: string;
    revoking?: string;
    never?: string;
  };
}

function formatDate(value: string | null, never: string): string {
  if (!value) return never;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return never;
  return date.toLocaleDateString();
}

function RevokeButton({
  keyId,
  onRevoke,
  revokeLabel,
  revokingLabel,
}: {
  keyId: string;
  onRevoke: (id: string) => void | Promise<void>;
  revokeLabel: string;
  revokingLabel: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await onRevoke(keyId);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="text-xs font-medium text-red-11 transition-colors hover:text-red-12 focus:outline-none focus:ring-2 focus:ring-red-8 focus:ring-offset-1 disabled:opacity-50"
    >
      {pending ? revokingLabel : revokeLabel}
    </button>
  );
}

export function ApiKeysList({
  keys,
  onCreate,
  onRevoke,
  emptyTitle = "No API keys yet",
  emptyCta = "Create your first API key",
  columnLabels = {},
}: ApiKeysListProps) {
  const labels = {
    name: columnLabels.name ?? "Name",
    prefix: columnLabels.prefix ?? "Prefix",
    lastUsed: columnLabels.lastUsed ?? "Last Used",
    scopes: columnLabels.scopes ?? "Scopes",
    created: columnLabels.created ?? "Created",
    actions: columnLabels.actions ?? "Actions",
    revoke: columnLabels.revoke ?? "Revoke",
    revoking: columnLabels.revoking ?? "Revoking…",
    never: columnLabels.never ?? "Never",
  };

  if (keys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--neutral-7)] bg-[var(--neutral-2)] py-10 text-center">
        <p className="mb-3 text-sm text-[var(--neutral-11)]">{emptyTitle}</p>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--brand-gradient)" }}
        >
          {emptyCta}
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--neutral-7)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--neutral-2)] text-left text-xs font-medium text-[var(--neutral-11)]">
          <tr>
            <th scope="col" className="px-4 py-2.5">
              {labels.name}
            </th>
            <th scope="col" className="px-4 py-2.5">
              {labels.prefix}
            </th>
            <th scope="col" className="px-4 py-2.5">
              {labels.lastUsed}
            </th>
            <th scope="col" className="px-4 py-2.5">
              {labels.scopes}
            </th>
            <th scope="col" className="px-4 py-2.5">
              {labels.created}
            </th>
            <th scope="col" className="px-4 py-2.5 text-right">
              {labels.actions}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--neutral-6)] bg-[var(--neutral-1)]">
          {keys.map((k) => (
            <tr key={k.id}>
              <td className="px-4 py-3 font-medium text-[var(--neutral-12)]">{k.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--neutral-11)]">
                {k.keyPrefix}…
              </td>
              <td className="px-4 py-3 text-xs text-[var(--neutral-11)]">
                {formatDate(k.lastUsedAt, labels.never)}
              </td>
              <td className="px-4 py-3 text-xs text-[var(--neutral-11)]">
                {k.scopes.length > 0 ? k.scopes.join(", ") : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-[var(--neutral-11)]">
                {formatDate(k.createdAt, labels.never)}
              </td>
              <td className="px-4 py-3 text-right">
                <RevokeButton
                  keyId={k.id}
                  onRevoke={onRevoke}
                  revokeLabel={labels.revoke}
                  revokingLabel={labels.revoking}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
