"use client";

import { useFormatter, useTranslations } from "next-intl";
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
  emptyTitle,
  emptyCta,
  columnLabels = {},
}: ApiKeysListProps) {
  const format = useFormatter();
  const tSos = useTranslations("startupOs");
  const resolvedEmptyTitle = emptyTitle ?? tSos("emptyState.apiKeys");
  const resolvedEmptyCta = emptyCta ?? tSos("emptyState.apiKeysCta");

  function formatDate(value: string | null, neverLabel: string): string {
    if (!value) return neverLabel;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return neverLabel;
    return format.dateTime(date, { year: "numeric", month: "short", day: "numeric" });
  }

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
      <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-muted py-10 text-center">
        <p className="mb-3 text-sm text-muted-foreground">{resolvedEmptyTitle}</p>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "hsl(var(--primary))" }}
        >
          {resolvedEmptyCta}
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs font-medium text-muted-foreground">
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
        <tbody className="divide-y divide-border bg-background">
          {keys.map((k) => (
            <tr key={k.id}>
              <td className="px-4 py-3 font-medium text-foreground">{k.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.keyPrefix}…</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {formatDate(k.lastUsedAt, labels.never)}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {k.scopes.length > 0 ? k.scopes.join(", ") : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
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
