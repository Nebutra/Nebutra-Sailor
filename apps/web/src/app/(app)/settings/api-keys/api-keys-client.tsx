"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type ApiKey, ApiKeysList } from "@/components/api-keys/api-keys-list";
import {
  CreateApiKeyDialog,
  type CreateApiKeyInput,
  type CreatedApiKey,
} from "@/components/api-keys/create-api-key-dialog";
import { queryKeys } from "@/lib/query-keys";

async function fetchKeys(signal?: AbortSignal): Promise<ApiKey[]> {
  const res = await fetch("/api/api-keys", { cache: "no-store", signal });
  if (!res.ok) {
    throw new Error(`Failed to load API keys (${res.status})`);
  }
  const data = (await res.json()) as { keys: ApiKey[] };
  return data.keys ?? [];
}

async function createKey(input: CreateApiKeyInput): Promise<CreatedApiKey> {
  const res = await fetch("/api/api-keys", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body === "object" && body && "error" in body
        ? String((body as { error: unknown }).error)
        : "Failed to create key.",
    );
  }
  return (await res.json()) as CreatedApiKey;
}

async function revokeKey(id: string): Promise<void> {
  const res = await fetch(`/api/api-keys/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to revoke key (${res.status})`);
  }
}

export function ApiKeysPageClient() {
  // Pure UI state (dialog open/close) stays local — not server cache.
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const listKey = queryKeys.apiKeys.list();

  const keysQuery = useQuery({
    queryKey: listKey,
    queryFn: ({ signal }) => fetchKeys(signal),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateApiKeyInput) => createKey(input),
    onSettled: () => {
      // Refresh list in the background so the new key appears once dialog closes.
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeKey(id),
    // Optimistically drop the key from the cached list, mirroring the previous
    // local-state behaviour where the row disappeared immediately on revoke.
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<ApiKey[]>(listKey);
      queryClient.setQueryData<ApiKey[]>(listKey, (current) =>
        (current ?? []).filter((k) => k.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      // Roll back to the snapshot taken in onMutate.
      if (context?.previous !== undefined) {
        queryClient.setQueryData<ApiKey[]>(listKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const handleCreate = async (input: CreateApiKeyInput): Promise<CreatedApiKey> => {
    return createMutation.mutateAsync(input);
  };

  const handleRevoke = async (id: string): Promise<void> => {
    // Rollback on failure is handled by the mutation's onError; swallow the
    // rejection so a fire-and-forget caller can't surface an unhandled rejection
    // (failure is reflected via revokeMutation.isError). Mirrors the pattern used
    // in notifications-page-client.
    await revokeMutation.mutateAsync(id).catch(() => undefined);
  };

  const keys = keysQuery.data ?? [];
  const error = keysQuery.error
    ? keysQuery.error instanceof Error
      ? keysQuery.error.message
      : "Failed to load keys."
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "hsl(var(--primary))" }}
        >
          Create API key
        </button>
      </div>

      {error ? (
        <p className="rounded-[var(--radius-md)] border border-red-700/30 bg-red-200 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      {keysQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ApiKeysList keys={keys} onCreate={() => setDialogOpen(true)} onRevoke={handleRevoke} />
      )}

      <CreateApiKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={handleCreate} />
    </div>
  );
}
