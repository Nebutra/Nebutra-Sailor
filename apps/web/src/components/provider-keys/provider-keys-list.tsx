"use client";

import { Badge, DataList, type DataListColumn } from "@nebutra/ui/primitives";
import { useState } from "react";

export type ProviderId = "OPENAI" | "ANTHROPIC" | "GOOGLE" | "SILICONFLOW" | "CUSTOM";

export interface ProviderKey {
  id: string;
  provider: ProviderId;
  label: string;
  isActive: boolean;
  alwaysUse: boolean;
  baseUrl: string | null;
  maskedKey: string | null;
  createdAt: string;
}

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  OPENAI: "OpenAI",
  ANTHROPIC: "Anthropic",
  GOOGLE: "Google",
  SILICONFLOW: "SiliconFlow",
  CUSTOM: "Custom (OpenAI-compatible)",
};

function DeleteButton({
  provider,
  onDelete,
}: {
  provider: ProviderId;
  onDelete: (provider: ProviderId) => void | Promise<void>;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await onDelete(provider);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      data-testid={`provider-key-remove-${provider}`}
      className="text-xs font-medium text-red-900 transition-colors hover:text-red-900/80 disabled:opacity-50"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

interface ProviderKeysListProps {
  keys: ProviderKey[];
  onAdd: () => void;
  onDelete: (provider: ProviderId) => void | Promise<void>;
  /** Gates the empty-state add button (provider_key:create). */
  canCreate: boolean;
  /** Gates the per-row Remove action (provider_key:delete). */
  canDelete: boolean;
  /**
   * First load. Renders the reserved skeleton floor instead of the rows, so the
   * list does not appear from nothing once the fetch settles.
   */
  isLoading?: boolean | undefined;
  /**
   * A background refetch or a settling optimistic delete. Deliberately NOT
   * `isLoading`: the mounted rows stay mounted while the mutation lands.
   */
  isRefreshing?: boolean | undefined;
  /** Fetch failure copy. Its presence alone puts the list in the error state. */
  error?: string | null | undefined;
  /** Retry affordance shown on the error body. */
  onRetry?: (() => void) | undefined;
}

export function ProviderKeysList({
  keys,
  onAdd,
  onDelete,
  canCreate,
  canDelete,
  isLoading = false,
  isRefreshing = false,
  error,
  onRetry,
}: ProviderKeysListProps) {
  const columns: readonly DataListColumn<ProviderKey>[] = [
    {
      id: "provider",
      header: "Provider",
      loadingWidth: "45%",
      cell: (k) => (
        <span className="min-w-0 truncate font-medium text-foreground">
          {PROVIDER_LABELS[k.provider]}
          {k.label ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">{k.label}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: "key",
      header: "Key",
      loadingWidth: "70%",
      cell: (k) => (
        <span className="truncate font-mono text-xs text-muted-foreground">
          {k.maskedKey ?? "—"}
        </span>
      ),
    },
    {
      id: "routing",
      header: "Routing",
      loadingWidth: "55%",
      cell: (k) =>
        k.alwaysUse ? (
          // blue-subtle is bg-primary/10 + text-primary — 5.71:1, AA-safe in
          // both themes. Never surface a raw --status-* as foreground here.
          <Badge variant="blue-subtle" size="sm">
            Always use this key
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Prefer, fall back to platform</span>
        ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "end",
      width: 96,
      loadingWidth: 56,
      cell: (k) =>
        canDelete ? (
          <DeleteButton provider={k.provider} onDelete={onDelete} />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="rounded-[var(--radius-lg)] bg-muted/25 p-2">
      <DataList<ProviderKey>
        label="Provider keys"
        data-testid="provider-keys-list"
        columns={columns}
        rows={keys}
        getRowKey={(k) => k.id}
        {...(isLoading ? { status: "loading" as const } : {})}
        isRefreshing={isRefreshing}
        {...(error ? { error } : {})}
        errorTitle="Provider keys did not load"
        retryLabel="Try again"
        {...(onRetry === undefined ? {} : { onRetry })}
        emptyTitle="No provider keys configured"
        emptyDescription="Add a key and this workspace routes that provider's traffic through your own account."
        {...(canCreate
          ? {
              emptyAction: (
                <button
                  type="button"
                  onClick={onAdd}
                  data-testid="provider-keys-empty-add"
                  className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  Add your first provider key
                </button>
              ),
            }
          : {})}
      />
    </div>
  );
}
