"use client";

import { Button, DataList, type DataListColumn, type DataListStatus } from "@nebutra/ui/primitives";
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
  emptyTitle?: string | undefined;
  emptyCta?: string | undefined;
  /**
   * Explicit list state. Omitted → derived by DataList (error > empty > rows),
   * which is exactly the previous behaviour of this screen.
   */
  status?: DataListStatus | undefined;
  /**
   * A background refetch or a settling optimistic revoke. Deliberately not
   * `status="loading"`: the caller revokes optimistically, and the mounted rows
   * must survive the refetch that follows.
   */
  isRefreshing?: boolean | undefined;
  /** Load failure copy. Presence alone puts the list into its error state. */
  error?: string | null | undefined;
  onRetry?: (() => void) | undefined;
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
    /** Accessible name for the table itself. */
    table?: string;
    /** Heading shown on the error body. */
    errorTitle?: string;
    /** Retry affordance on the error body. */
    retry?: string;
    /** Supporting line under the empty title. */
    emptyDescription?: string;
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
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={handleClick}
      // --destructive is fill-only in dark (2.13:1 on the card). Only neutral,
      // blue and cyan have 12-step scales, so red-11/red-3 resolve to nothing —
      // the registered red ramp is the AA-safe step that carries text (5.32 light
      // / 5.27 dark).
      className="px-2 text-xs font-medium text-[hsl(var(--destructive-strong))] hover:bg-destructive/10 hover:text-[hsl(var(--destructive-strong))]/80"
    >
      {pending ? revokingLabel : revokeLabel}
    </Button>
  );
}

export function ApiKeysList({
  keys,
  onCreate,
  onRevoke,
  emptyTitle,
  emptyCta,
  status,
  isRefreshing = false,
  error,
  onRetry,
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
    table: columnLabels.table ?? "API keys",
    errorTitle: columnLabels.errorTitle ?? "We couldn't load your API keys",
    retry: columnLabels.retry ?? "Try again",
    emptyDescription:
      columnLabels.emptyDescription ?? "A key lets your own code call the API on your behalf.",
  };

  const columns: readonly DataListColumn<ApiKey>[] = [
    {
      id: "name",
      header: labels.name,
      cell: (k) => <span className="truncate font-medium text-foreground">{k.name}</span>,
      loadingWidth: "45%",
    },
    {
      id: "prefix",
      header: labels.prefix,
      cell: (k) => <span className="font-mono text-xs text-muted-foreground">{k.keyPrefix}…</span>,
      loadingWidth: "70%",
    },
    {
      id: "lastUsed",
      header: labels.lastUsed,
      cell: (k) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(k.lastUsedAt, labels.never)}
        </span>
      ),
      loadingWidth: "55%",
    },
    {
      id: "scopes",
      header: labels.scopes,
      cell: (k) => (
        <span className="truncate text-xs text-muted-foreground">
          {k.scopes.length > 0 ? k.scopes.join(", ") : "—"}
        </span>
      ),
      loadingWidth: "50%",
    },
    {
      id: "created",
      header: labels.created,
      cell: (k) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(k.createdAt, labels.never)}
        </span>
      ),
      loadingWidth: "55%",
    },
    {
      id: "actions",
      header: labels.actions,
      align: "end",
      cell: (k) => (
        <RevokeButton
          keyId={k.id}
          onRevoke={onRevoke}
          revokeLabel={labels.revoke}
          revokingLabel={labels.revoking}
        />
      ),
      loadingWidth: 56,
    },
  ];

  return (
    // Card surface, no rule: the panel is set apart by a tonal shift plus its
    // own padding rather than the border this screen used to draw.
    <div className="rounded-[var(--radius-lg)] bg-card p-2" data-testid="api-keys-list">
      <DataList<ApiKey>
        columns={columns}
        rows={keys}
        getRowKey={(k) => k.id}
        label={labels.table}
        {...(status === undefined ? {} : { status })}
        isRefreshing={isRefreshing}
        {...(error ? { error } : {})}
        errorTitle={labels.errorTitle}
        {...(onRetry === undefined ? {} : { onRetry })}
        retryLabel={labels.retry}
        emptyTitle={resolvedEmptyTitle}
        emptyDescription={labels.emptyDescription}
        emptyAction={
          <Button type="button" onClick={onCreate}>
            {resolvedEmptyCta}
          </Button>
        }
      />
    </div>
  );
}
