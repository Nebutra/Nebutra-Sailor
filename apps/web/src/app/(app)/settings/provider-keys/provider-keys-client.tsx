"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CreateProviderKeyDialog,
  type CreateProviderKeyInput,
} from "@/components/provider-keys/create-provider-key-dialog";
import {
  type ProviderId,
  type ProviderKey,
  ProviderKeysList,
} from "@/components/provider-keys/provider-keys-list";
import { usePermission } from "@/hooks/usePermission";
import { queryKeys } from "@/lib/query-keys";

async function fetchKeys(signal?: AbortSignal): Promise<ProviderKey[]> {
  const res = await fetch("/api/provider-keys", { cache: "no-store", signal });
  if (!res.ok) {
    throw new Error(`Failed to load provider keys (${res.status})`);
  }
  const data = (await res.json()) as { keys: ProviderKey[] };
  return data.keys ?? [];
}

async function saveKey(input: CreateProviderKeyInput): Promise<void> {
  const res = await fetch("/api/provider-keys", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body === "object" && body && "error" in body
        ? String((body as { error: unknown }).error)
        : "Failed to save key.",
    );
  }
}

async function deleteKey(provider: ProviderId): Promise<void> {
  const res = await fetch(`/api/provider-keys/${encodeURIComponent(provider)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to remove key (${res.status})`);
  }
}

export function ProviderKeysClient() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const canCreate = can("provider_key:create");
  const canDelete = can("provider_key:delete");
  const listKey = queryKeys.providerKeys.list();

  const keysQuery = useQuery({
    queryKey: listKey,
    queryFn: ({ signal }) => fetchKeys(signal),
  });

  const saveMutation = useMutation({
    mutationFn: (input: CreateProviderKeyInput) => saveKey(input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (provider: ProviderId) => deleteKey(provider),
    onMutate: async (provider: ProviderId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<ProviderKey[]>(listKey);
      queryClient.setQueryData<ProviderKey[]>(listKey, (current) =>
        (current ?? []).filter((k) => k.provider !== provider),
      );
      return { previous };
    },
    onError: (_err, _provider, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<ProviderKey[]>(listKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const handleCreate = async (input: CreateProviderKeyInput): Promise<void> => {
    await saveMutation.mutateAsync(input);
  };

  const handleDelete = async (provider: ProviderId): Promise<void> => {
    await deleteMutation.mutateAsync(provider).catch(() => undefined);
  };

  const keys = keysQuery.data ?? [];
  const error = keysQuery.error
    ? keysQuery.error instanceof Error
      ? keysQuery.error.message
      : "Failed to load keys."
    : null;

  return (
    <div className="space-y-4">
      {canCreate ? (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "hsl(var(--primary))" }}
          >
            Add provider key
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-[var(--radius-md)] border border-red-6 bg-red-2 px-3 py-2 text-sm text-red-11">
          {error}
        </p>
      ) : null}

      {keysQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ProviderKeysList
          keys={keys}
          onAdd={() => setDialogOpen(true)}
          onDelete={handleDelete}
          canCreate={canCreate}
          canDelete={canDelete}
        />
      )}

      <CreateProviderKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={handleCreate}
      />
    </div>
  );
}
